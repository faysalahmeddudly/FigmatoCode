import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FigmaClient } from "../packages/figma-client/dist/index.js";
import { parseDocument } from "../packages/figma-parser/dist/index.js";
import { validateDocument } from "../packages/design-ir/dist/index.js";
import { generateHtml, generateCss } from "../packages/code-generator/dist/index.js";
import { resolveAndCacheFont } from "../packages/font-engine/dist/index.js";
import { Renderer } from "../packages/renderer/dist/index.js";
import {
  computeGeometryDiffs,
  computeGeometryScore,
} from "../packages/geometry-engine/dist/index.js";
import { compareImages } from "../packages/visual-engine/dist/index.js";
import { computeFidelityScore } from "../packages/benchmark/dist/index.js";
import type { DesignDocument, TypographyIR } from "../packages/shared-contracts/dist/index.js";
import type { FigmaFileNodeEntry } from "../packages/figma-client/dist/index.js";

const FILE_KEY = "si0LCoBsffi63CK8doDsO4";
const NODE_ID = "21:16041";

// Set these to replay a previous run's already-fetched real Figma data (node tree +
// reference export) without making new API calls -- avoids needlessly re-hitting Figma's
// rate limit during iterative dev/testing. Unset (the default) always fetches live.
const CACHED_NODE_JSON_PATH = process.env.CACHED_NODE_JSON_PATH;
const CACHED_REFERENCE_PNG_PATH = process.env.CACHED_REFERENCE_PNG_PATH;

function distinctFonts(doc: DesignDocument): TypographyIR[] {
  const seen = new Map<string, TypographyIR>();
  for (const node of Object.values(doc.nodes)) {
    if (!node.typography) continue;
    const key = `${node.typography.fontFamily}|${node.typography.fontWeight}|${node.typography.fontStyle}`;
    if (!seen.has(key)) seen.set(key, node.typography);
  }
  return [...seen.values()];
}

async function main() {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN is not set in .env");

  const runId = `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runDir = join("output", runId);
  const genDir = join(runDir, "generated");
  const fontsDir = join(genDir, "fonts");
  const rendersDir = join(runDir, "renders");
  const diffsDir = join(runDir, "diffs");
  const referenceDir = join(runDir, "reference-artifacts");
  const reportsDir = join(runDir, "reports");
  for (const dir of [genDir, fontsDir, rendersDir, diffsDir, referenceDir, reportsDir]) {
    mkdirSync(dir, { recursive: true });
  }

  console.log(`Run: ${runId}`);

  const client = new FigmaClient({ token, maxRetries: 5, initialBackoffMs: 5000 });

  // 1. Extract + parse + validate.
  let entry: FigmaFileNodeEntry;
  let figmaFileVersion: string;
  if (CACHED_NODE_JSON_PATH) {
    entry = JSON.parse(readFileSync(CACHED_NODE_JSON_PATH, "utf8"));
    figmaFileVersion = "cached";
    console.log(`Using cached Figma node data from ${CACHED_NODE_JSON_PATH}`);
  } else {
    const response = await client.getFileNodes(FILE_KEY, [NODE_ID]);
    const fetched = response.nodes[NODE_ID];
    if (!fetched) throw new Error(`Node ${NODE_ID} not present in response`);
    entry = fetched;
    figmaFileVersion = response.version;
  }
  const parsed = parseDocument(entry.document, {
    figmaFileVersion,
    parserVersion: "0.0.0",
  });
  const doc = validateDocument(parsed);

  // PRD §4.1: "Figma geometry and Figma rendered pixels are not the same thing." Confirmed
  // here directly -- this frame's absoluteBoundingBox is 846x583, but its strokeAlign is
  // CENTER, so the 1px stroke extends 0.5px outside the bounding box on each edge; Figma's
  // own image export rasterizes that overflow, producing an actual 847x584 PNG. The render
  // viewport has to match what Figma actually exports (absoluteRenderBounds), not the plain
  // layout box, or the two images can never be compared pixel-for-pixel.
  const renderBounds = (
    entry.document as { absoluteRenderBounds?: { width: number; height: number } }
  ).absoluteRenderBounds;
  const viewport = renderBounds
    ? { width: Math.round(renderBounds.width), height: Math.round(renderBounds.height) }
    : {
        width: Math.round(doc.nodes[doc.rootId]!.absolute.width),
        height: Math.round(doc.nodes[doc.rootId]!.absolute.height),
      };
  console.log(
    `Parsed + validated ${Object.keys(doc.nodes).length} nodes. Frame size: ${viewport.width}x${viewport.height}`,
  );

  // 2. Fetch the REFERENCE image: Figma's own render of this frame (§4.1 Reference Rendering
  // Contract) -- ground truth for comparison, not re-derived from our own geometry.
  let referenceBytes: Uint8Array;
  if (CACHED_REFERENCE_PNG_PATH) {
    referenceBytes = readFileSync(CACHED_REFERENCE_PNG_PATH);
    console.log(`Using cached reference image from ${CACHED_REFERENCE_PNG_PATH}`);
  } else {
    const imageUrls = await client.getImageUrls(FILE_KEY, [NODE_ID], { scale: 1, format: "png" });
    const referenceUrl = imageUrls.images[NODE_ID];
    if (!referenceUrl) throw new Error(`Figma did not return an export URL for ${NODE_ID}`);
    referenceBytes = await client.downloadImage(referenceUrl);
  }
  const referencePath = join(referenceDir, `${viewport.width}x${viewport.height}.png`);
  writeFileSync(referencePath, referenceBytes);
  console.log(`Reference image saved: ${referenceBytes.length} bytes`);

  // 3. Fonts + generate CANDIDATE HTML/CSS.
  const fonts = distinctFonts(doc);
  const fontFaceBlocks: string[] = [];
  for (const font of fonts) {
    const cached = await resolveAndCacheFont(
      font.fontFamily,
      font.fontWeight,
      font.fontStyle,
      fontsDir,
    );
    fontFaceBlocks.push(cached.cssText);
  }
  writeFileSync(join(genDir, "index.html"), generateHtml(doc));
  writeFileSync(
    join(genDir, "styles.css"),
    `${fontFaceBlocks.join("\n\n")}\n\n${generateCss(doc)}`,
  );

  // 4. Render CANDIDATE at the frame's own native size (matching the reference export scale).
  const renderer = new Renderer();
  await renderer.launch();
  const candidatePath = join(rendersDir, `${viewport.width}x${viewport.height}.png`);
  let geometryScore = 0;
  let visualResult;
  try {
    const renderResult = await renderer.render({
      htmlPath: join(genDir, "index.html"),
      viewport,
      screenshotPath: candidatePath,
    });

    // 5. Geometry comparison (geometry-engine): reference NodeIR geometry vs measured DOM.
    const { diffs, missingNodeIds } = computeGeometryDiffs(doc, renderResult.domMetrics);
    geometryScore = computeGeometryScore(diffs, doc);
    if (missingNodeIds.length > 0) {
      console.log(
        `Nodes missing from DOM metrics (likely invisible/unrendered): ${missingNodeIds.join(", ")}`,
      );
    }
    writeFileSync(
      join(reportsDir, "geometry-diff.json"),
      JSON.stringify({ diffs, missingNodeIds }, null, 2),
    );

    // 6. Visual comparison (visual-engine): reference PNG vs candidate PNG.
    visualResult = compareImages(Buffer.from(referenceBytes), readFileSync(candidatePath), doc);
    writeFileSync(
      join(diffsDir, `${viewport.width}x${viewport.height}.png`),
      visualResult.diffImagePng,
    );
  } finally {
    await renderer.close();
  }

  // 7. Fidelity score (benchmark): Geometry + Perceptual are real; Layout/Typography/Style/
  // Assets are not implemented yet and are honestly omitted, not defaulted to 100.
  const fidelity = computeFidelityScore({
    geometry: geometryScore,
    perceptual: visualResult.perceptualSimilarity,
  });

  const report = {
    runId,
    fidelity,
    geometryScore,
    perceptualSimilarity: visualResult.perceptualSimilarity,
    mismatchedPixels: visualResult.mismatchedPixels,
    totalPixels: visualResult.totalPixels,
    regionCount: visualResult.regions.length,
    regions: visualResult.regions,
  };
  writeFileSync(join(reportsDir, "run.json"), JSON.stringify(report, null, 2));

  console.log(`Geometry score: ${geometryScore.toFixed(2)}`);
  console.log(`Perceptual similarity: ${visualResult.perceptualSimilarity.toFixed(2)}`);
  console.log(
    `Fidelity (${fidelity.scoreProfileId}): ${fidelity.score} [used: ${fidelity.componentsUsed.join(",")}; missing: ${fidelity.componentsMissing.join(",")}]`,
  );
  console.log(`Diff regions: ${visualResult.regions.length}`);
  console.log(`Run complete: ${runDir}`);
}

main().catch((error) => {
  console.error("FAILED:", error.code ?? error.name, "-", error.message);
  console.error(error.stack);
  process.exitCode = 1;
});
