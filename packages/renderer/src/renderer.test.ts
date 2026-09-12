import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Renderer } from "./renderer.js";

describe("Renderer", () => {
  const renderer = new Renderer();
  let dir: string;

  beforeAll(async () => {
    await renderer.launch();
    dir = mkdtempSync(join(tmpdir(), "renderer-test-"));
  });

  afterAll(async () => {
    await renderer.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("waits for readiness and produces a screenshot at the requested viewport", async () => {
    const htmlPath = join(dir, "page.html");
    writeFileSync(
      htmlPath,
      `<!doctype html><html><body style="margin:0;background:#ff0000;width:200px;height:100px"></body></html>`,
    );
    const screenshotPath = join(dir, "out.png");

    const result = await renderer.render({
      htmlPath,
      viewport: { width: 200, height: 100 },
      screenshotPath,
    });

    expect(result.screenshotPath).toBe(screenshotPath);
    expect(existsSync(screenshotPath)).toBe(true);
  }, 30000);

  it("exposes browser/node provenance after launch", () => {
    const provenance = renderer.getProvenance();
    expect(provenance.browserVersion).toMatch(/^\d+\./);
    expect(provenance.nodeVersion).toBe(process.version);
  });

  it("closes each render's context, leaving localStorage empty for the next render", async () => {
    // §5.3 candidate isolation: render() must open a fresh BrowserContext per call and close
    // it afterward, rather than reusing one context across renders (which would let
    // cookies/localStorage/etc leak from one candidate evaluation into the next).
    const setHtmlPath = join(dir, "set-storage.html");
    writeFileSync(
      setHtmlPath,
      `<!doctype html><html><body><script>localStorage.setItem("seen", "1");</script></body></html>`,
    );
    const readHtmlPath = join(dir, "read-storage.html");
    writeFileSync(
      readHtmlPath,
      `<!doctype html><html><head><title>init</title></head><body><script>
        document.title = localStorage.getItem("seen") ?? "empty";
      </script></body></html>`,
    );

    await renderer.render({
      htmlPath: setHtmlPath,
      viewport: { width: 100, height: 100 },
      screenshotPath: join(dir, "s1.png"),
    });
    const second = await renderer.render({
      htmlPath: readHtmlPath,
      viewport: { width: 100, height: 100 },
      screenshotPath: join(dir, "s2.png"),
    });

    expect(second.title).toBe("empty");
  }, 30000);
});
