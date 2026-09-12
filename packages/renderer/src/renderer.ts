import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";

export interface RenderOptions {
  htmlPath: string;
  viewport: { width: number; height: number };
  screenshotPath: string;
  deviceScaleFactor?: number;
  colorScheme?: "light" | "dark" | "no-preference";
  reducedMotion?: "reduce" | "no-preference";
  locale?: string;
  timezoneId?: string;
  readinessTimeoutMs?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderResult {
  screenshotPath: string;
  title: string;
  domMetrics: Record<string, Rect>;
}

export interface RenderProvenance {
  browserVersion: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
}

// PRD §5.3 Chromium reuse contract: one browser process, one Renderer instance reused across
// N render calls. Each render() still gets its own fresh BrowserContext (closed afterward) so
// cookies/localStorage/sessionStorage/etc never leak between renders -- candidate isolation
// (§5.3/ADR-013) even though M2 only exercises a single render.
export class Renderer {
  private browser: Browser | null = null;

  async launch(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch();
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
  }

  getProvenance(): RenderProvenance {
    if (!this.browser) throw new Error("Renderer.launch() must be called first");
    return {
      browserVersion: this.browser.version(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }

  // PRD §4.5 font/asset readiness precondition (non-optional): no screenshot until
  // document.fonts.ready resolves, all images report complete, and the network is idle.
  // Screenshot-before-ready is not an acceptable shortcut, even in early prototyping.
  async render(options: RenderOptions): Promise<RenderResult> {
    if (!this.browser) throw new Error("Renderer.launch() must be called first");

    const context = await this.browser.newContext({
      viewport: options.viewport,
      deviceScaleFactor: options.deviceScaleFactor ?? 1,
      colorScheme: options.colorScheme ?? "light",
      reducedMotion: options.reducedMotion ?? "no-preference",
      locale: options.locale ?? "en-US",
      timezoneId: options.timezoneId ?? "UTC",
    });

    try {
      const page = await context.newPage();
      const fileUrl = pathToFileURL(options.htmlPath).href;
      const timeout = options.readinessTimeoutMs ?? 15000;

      await page.goto(fileUrl, { waitUntil: "networkidle", timeout });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(
        () => Array.from(document.images).every((img) => img.complete),
        undefined,
        {
          timeout,
        },
      );

      await page.screenshot({ path: options.screenshotPath });

      // PRD §4 pipeline step "Chromium -> DOM metrics": measured for every element whose
      // class encodes a node identity (code-generator's "n-<internalId>" convention, §14.7),
      // relative to the page's own scroll-adjusted origin so it lines up with geometry-engine's
      // frame-local coordinate space.
      const domMetrics = await page.evaluate(() => {
        const result: Record<string, { x: number; y: number; width: number; height: number }> = {};
        for (const el of document.querySelectorAll('[class^="n-"]')) {
          const id = el.className.replace(/^n-/, "");
          const rect = el.getBoundingClientRect();
          result[id] = {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height,
          };
        }
        return result;
      });

      return { screenshotPath: options.screenshotPath, title: await page.title(), domMetrics };
    } finally {
      await context.close();
    }
  }
}
