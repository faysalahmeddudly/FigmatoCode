import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { Renderer } from "@figma-engine/renderer";
import { makeRunId } from "./run-id.js";
import { RunOutput } from "./output.js";

// figma-engine render --html <index.html> --width <w> --height <h> [--out <dir>]
//
// PRD §20.1 / M2: render HTML/CSS via Playwright/Chromium with the full readiness
// precondition enforced (document.fonts.ready, all images complete, network idle).
// Writes screenshot + DOM metrics + provenance to output/<runId>/.
export function registerRenderCommand(program: Command): void {
  program
    .command("render")
    .description("Render HTML to a Chromium screenshot with DOM metrics")
    .requiredOption("--html <path>", "Path to compiled index.html")
    .option("--width <px>", "Viewport width", "1440")
    .option("--height <px>", "Viewport height", "900")
    .option("--dpr <n>", "Device scale factor", "1")
    .option("--out <dir>", "Output root directory", "output")
    .action(
      async (opts: { html: string; width: string; height: string; dpr: string; out: string }) => {
        const width = parseInt(opts.width, 10);
        const height = parseInt(opts.height, 10);
        const dpr = parseFloat(opts.dpr);
        const runId = makeRunId(`render:${opts.html}`);
        const out = new RunOutput(runId, opts.out);
        await out.init();

        console.log(`[render] run=${runId} html=${opts.html} ${width}x${height} dpr=${dpr}`);

        const screenshotPath = out.path("screenshot.png");
        const renderer = new Renderer();

        try {
          await renderer.launch();
          const provenance = renderer.getProvenance();

          const result = await renderer.render({
            htmlPath: opts.html,
            viewport: { width, height },
            screenshotPath,
            deviceScaleFactor: dpr,
          });

          const domMetricsJson = JSON.stringify(result.domMetrics, null, 2) + "\n";
          const domMetricsPath = await out.write("dom-metrics.json", domMetricsJson);

          await out.writeManifest({
            runId,
            generatorVersion: "0.0.0",
            startedAt: new Date().toISOString(),
            sourceHtml: opts.html,
            viewport: { width, height, dpr },
            screenshotPath: result.screenshotPath,
            screenshotHash: RunOutput.sha256(await readFile(screenshotPath)),
            domMetricsPath,
            domMetricsHash: RunOutput.sha256(domMetricsJson),
            provenance,
            pageTitle: result.title,
          });

          console.log(`[render] ✓ screenshot → ${result.screenshotPath}`);
          console.log(`[render] ✓ dom-metrics → ${domMetricsPath}`);
          console.log(`[render] ✓ browser: ${provenance.browserVersion}`);
        } finally {
          await renderer.close();
        }
      },
    );
}
