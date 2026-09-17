import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { computeGeometryDiffs } from "@figma-engine/geometry-engine";
import { computeGeometryScore } from "@figma-engine/geometry-engine";
import { compareImages } from "@figma-engine/visual-engine";
import { validateDocument } from "@figma-engine/design-ir";
import { computeFidelityScore } from "@figma-engine/benchmark";
import { makeRunId } from "./run-id.js";
import { RunOutput } from "./output.js";

// figma-engine compare --ir <node-ir.json> --reference <reference.png>
//                      --candidate <screenshot.png> --dom-metrics <dom-metrics.json>
//                      [--out <dir>]
//
// PRD §20.1 / M3 gate: geometry diff + visual diff → fidelity score.
// Writes comparison report to output/<runId>/comparison.json.
export function registerCompareCommand(program: Command): void {
  program
    .command("compare")
    .description("Compare a candidate screenshot against the Figma reference")
    .requiredOption("--ir <path>", "Path to node-ir.json")
    .requiredOption("--reference <path>", "Path to Figma reference PNG")
    .requiredOption("--candidate <path>", "Path to rendered candidate PNG")
    .requiredOption("--dom-metrics <path>", "Path to dom-metrics.json from render")
    .option("--out <dir>", "Output root directory", "output")
    .action(
      async (opts: {
        ir: string;
        reference: string;
        candidate: string;
        domMetrics: string;
        out: string;
      }) => {
        const runId = makeRunId(`compare:${opts.candidate}`);
        const out = new RunOutput(runId, opts.out);
        await out.init();

        console.log(`[compare] run=${runId}`);

        // Load inputs
        const irRaw = await readFile(opts.ir, "utf-8");
        const doc = validateDocument(JSON.parse(irRaw));

        const domMetrics: Record<string, { x: number; y: number; width: number; height: number }> =
          JSON.parse(await readFile(opts.domMetrics, "utf-8"));

        const referencePng = await readFile(opts.reference);
        const candidatePng = await readFile(opts.candidate);

        // Geometry comparison (§15.3)
        const geometryResult = computeGeometryDiffs(doc, domMetrics);
        const geometryScore = computeGeometryScore(geometryResult.diffs, doc);

        // Visual comparison (§15.2)
        const visualResult = compareImages(referencePng, candidatePng, doc);

        // Write diff image
        const diffPath = await out.write("diff.png", visualResult.diffImagePng);

        // Fidelity score (§15.4) — geometry + perceptual only for now
        const fidelity = computeFidelityScore({
          geometry: geometryScore / 100,      // computeFidelityScore expects 0–1
          perceptual: visualResult.perceptualSimilarity / 100, // already 0–100, normalize
        });

        const report = {
          runId,
          generatorVersion: "0.0.0",
          comparedAt: new Date().toISOString(),
          inputs: {
            ir: opts.ir,
            reference: opts.reference,
            candidate: opts.candidate,
            domMetrics: opts.domMetrics,
          },
          geometry: {
            score: geometryScore,
            nodeCount: Object.keys(doc.nodes).length,
            missingNodes: geometryResult.missingNodeIds.length,
            diffs: geometryResult.diffs,
          },
          visual: {
            mismatchedPixels: visualResult.mismatchedPixels,
            totalPixels: visualResult.totalPixels,
            perceptualSimilarity: visualResult.perceptualSimilarity,
            regionCount: visualResult.regions.length,
            diffImagePath: diffPath,
          },
          fidelity,
        };

        const reportJson = JSON.stringify(report, null, 2) + "\n";
        const reportPath = await out.write("comparison.json", reportJson);

        await out.writeManifest({
          runId,
          generatorVersion: "0.0.0",
          startedAt: new Date().toISOString(),
          comparisonReportPath: reportPath,
          fidelityScore: fidelity.score,
          scoreProfileId: fidelity.scoreProfileId,
        });

        console.log(`[compare] ✓ geometry score:    ${geometryScore.toFixed(2)}%`);
        console.log(
          `[compare] ✓ perceptual sim:   ${visualResult.perceptualSimilarity.toFixed(2)}%`,
        );
        console.log(`[compare] ✓ fidelity score:   ${(fidelity.score * 100).toFixed(2)}%`);
        console.log(
          `[compare] ✓ diff regions:     ${visualResult.regions.length} (${visualResult.mismatchedPixels} px)`,
        );
        console.log(`[compare] ✓ report → ${reportPath}`);
      },
    );
}
