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

export interface RenderResult {
  screenshotPath: string;
  title: string;
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
      return { screenshotPath: options.screenshotPath, title: await page.title() };
    } finally {
      await context.close();
    }
  }
}
