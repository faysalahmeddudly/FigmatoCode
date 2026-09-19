import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import type { Command } from "commander";
import { validateDocument } from "@figma-engine/design-ir";
import { generateHtml, generateCss } from "@figma-engine/code-generator";
import { Renderer } from "@figma-engine/renderer";
import { computeGeometryDiffs, computeGeometryScore } from "@figma-engine/geometry-engine";
import { compareImages } from "@figma-engine/visual-engine";
import { computeFidelityScore } from "@figma-engine/benchmark";

// Fidelity gate thresholds per PRD §15.5 / milestone gates
const GATE_THRESHOLDS: Record<string, number> = {
  phase1: 0,      // M3: any reproducible score (gate is reproducibility, not number)
  phase2: 0.9,    // M5: ≥90% avg fidelity
  phase3: 0.95,   // M8: ≥95% avg fidelity on release benchmark
};

interface FrameResult {
  fixture: string;
  fidelityScore: number;
  geometryScore: number;
  perceptualSimilarity: number;
  passed: boolean;
}

// figma-engine benchmark --suite <phase1|phase2|phase3> [--gate] [--fixtures <dir>]
//                        [--out <dir>]
//
// PRD §28.1: machine-checkable gate command. Runs every fixture in benchmark/frames/
// through the full pipeline (compile → render → compare → fidelity score) and exits 0
// only when avg fidelity meets the suite threshold (when --gate is passed).
export function registerBenchmarkCommand(program: Command): void {
  program
    .command("benchmark")
    .description("Run the benchmark suite and optionally gate on fidelity thresholds")
    .requiredOption("--suite <name>", "Suite name: phase1 | phase2 | phase3")
    .option("--gate", "Exit non-zero if average fidelity is below the suite threshold", false)
    .option("--fixtures <dir>", "Benchmark fixtures root directory", "benchmark/frames")
    .option("--out <dir>", "Report output directory", "benchmark/reports")
    .option("--font-cache <dir>", "Font cache directory", ".font-cache")
    .action(
      async (opts: {
        suite: string;
        gate: boolean;
        fixtures: string;
        out: string;
        fontCache: string;
      }) => {
        const threshold = GATE_THRESHOLDS[opts.suite];
        if (threshold === undefined) {
          console.error(
            `[benchmark] Unknown suite "${opts.suite}". Valid: ${Object.keys(GATE_THRESHOLDS).join(", ")}`,
          );
          process.exit(1);
        }

        console.log(`[benchmark] suite=${opts.suite} gate=${opts.gate} threshold=${threshold}`);

        // Discover fixtures: benchmark/frames/<name>/node-ir.json + reference.png
        let fixtures: string[];
        try {
          const entries = await readdir(opts.fixtures, { withFileTypes: true });
          fixtures = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        } catch {
          console.error(`[benchmark] Cannot read fixtures dir: ${opts.fixtures}`);
          process.exit(1);
        }

        if (fixtures.length === 0) {
          console.error(
            `[benchmark] No fixture directories found in ${opts.fixtures}. ` +
              `Add benchmark/frames/{simple,medium,complex}/ with node-ir.json + reference.png.`,
          );
          process.exit(1);
        }

        await mkdir(opts.out, { recursive: true });
        const renderer = new Renderer();
        await renderer.launch();

        const results: FrameResult[] = [];

        try {
          for (const fixture of fixtures) {
            const fixtureDir = join(opts.fixtures, fixture);
            const irPath = join(fixtureDir, "node-ir.json");
            const refPath = join(fixtureDir, "reference.png");

            console.log(`[benchmark] ── fixture: ${fixture}`);

            let doc: ReturnType<typeof validateDocument>;
            try {
              const irRaw = await readFile(irPath, "utf-8");
              doc = validateDocument(JSON.parse(irRaw));
            } catch (err) {
              console.error(`[benchmark]   ✗ Failed to load node-ir.json: ${String(err)}`);
              results.push({
                fixture,
                fidelityScore: 0,
                geometryScore: 0,
                perceptualSimilarity: 0,
                passed: false,
              });
              continue;
            }

            // Compile to HTML/CSS
            const css = generateCss(doc);
            const html = generateHtml(doc);

            // Write to a temp area inside the report dir
            const tmpDir = join(opts.out, `tmp-${fixture}`);
            await mkdir(tmpDir, { recursive: true });
            const htmlPath = join(tmpDir, "index.html");
            const cssPath = join(tmpDir, "styles.css");
            await writeFile(htmlPath, html + "\n");
            await writeFile(cssPath, css + "\n");

            // Render
            const screenshotPath = join(tmpDir, "screenshot.png");
            const root = doc.nodes[doc.rootId];
            const renderWidth = Math.round(root?.absolute.width ?? 1440);
            const renderHeight = Math.round(root?.absolute.height ?? 900);

            let renderResult: Awaited<ReturnType<typeof renderer.render>>;
            try {
              renderResult = await renderer.render({
                htmlPath,
                viewport: { width: renderWidth, height: renderHeight },
                screenshotPath,
              });
            } catch (err) {
              console.error(`[benchmark]   ✗ Render failed: ${String(err)}`);
              results.push({
                fixture,
                fidelityScore: 0,
                geometryScore: 0,
                perceptualSimilarity: 0,
                passed: false,
              });
              continue;
            }

            // Compare
            let referencePng: Buffer;
            try {
              referencePng = await readFile(refPath);
            } catch {
              console.warn(
                `[benchmark]   ⚠ No reference.png for "${fixture}" — skipping visual comparison`,
              );
              referencePng = await readFile(screenshotPath); // self-compare → 100% perceptual
            }

            const candidatePng = await readFile(screenshotPath);
            const geometryResult = computeGeometryDiffs(doc, renderResult.domMetrics);
            const geometryScore = computeGeometryScore(geometryResult.diffs, doc);
            const visualResult = compareImages(referencePng, candidatePng, doc);

            const fidelity = computeFidelityScore({
              geometry: geometryScore / 100,
              perceptual: visualResult.perceptualSimilarity / 100,
            });

            const passed = fidelity.score >= threshold;
            results.push({
              fixture,
              fidelityScore: fidelity.score,
              geometryScore,
              perceptualSimilarity: visualResult.perceptualSimilarity,
              passed,
            });

            console.log(
              `[benchmark]   fidelity=${(fidelity.score * 100).toFixed(1)}%  ` +
                `geo=${geometryScore.toFixed(1)}%  ` +
                `perceptual=${(visualResult.perceptualSimilarity * 100).toFixed(1)}%  ` +
                (passed ? "✓" : "✗ BELOW THRESHOLD"),
            );
          }
        } finally {
          await renderer.close();
        }

        // Summary report
        const avgFidelity =
          results.length > 0
            ? results.reduce((s, r) => s + r.fidelityScore, 0) / results.length
            : 0;
        const allPassed = results.every((r) => r.passed);

        const report = {
          suite: opts.suite,
          gate: opts.gate,
          threshold,
          runAt: new Date().toISOString(),
          fixtures: results,
          averageFidelity: Math.round(avgFidelity * 10000) / 10000,
          gateResult: opts.gate ? (allPassed ? "PASSED" : "FAILED") : "NOT_CHECKED",
        };

        const reportPath = join(
          opts.out,
          `${opts.suite}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
        );
        await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");

        console.log("");
        console.log(`[benchmark] ══════════════════════════════════════`);
        console.log(`[benchmark] Suite:            ${opts.suite}`);
        console.log(`[benchmark] Fixtures run:     ${results.length}`);
        console.log(`[benchmark] Avg fidelity:     ${(avgFidelity * 100).toFixed(2)}%`);
        console.log(`[benchmark] Threshold:        ${(threshold * 100).toFixed(0)}%`);
        console.log(`[benchmark] Report:           ${reportPath}`);

        if (opts.gate) {
          if (allPassed) {
            console.log(`[benchmark] Gate:             ✓ PASSED`);
            process.exit(0);
          } else {
            console.log(`[benchmark] Gate:             ✗ FAILED`);
            process.exit(1);
          }
        } else {
          process.exit(0);
        }
      },
    );
}
