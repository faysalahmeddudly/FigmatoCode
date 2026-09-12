import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FigmaClient } from "../packages/figma-client/dist/index.js";
import { parseDocument } from "../packages/figma-parser/dist/index.js";
import { validateDocument } from "../packages/design-ir/dist/index.js";
import { generateHtml, generateCss } from "../packages/code-generator/dist/index.js";
import { resolveAndCacheFont } from "../packages/font-engine/dist/index.js";
import { Renderer } from "../packages/renderer/dist/index.js";
import type { DesignDocument, TypographyIR } from "../packages/shared-contracts/dist/index.js";

const FILE_KEY = "si0LCoBsffi63CK8doDsO4";
const NODE_ID = "21:16041";
const VIEWPORT = { width: 1440, height: 900 };

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
  const sourceDir = join(runDir, "source");
  const irDir = join(runDir, "ir");
  const genDir = join(runDir, "generated");
  const fontsDir = join(genDir, "fonts");
  const rendersDir = join(runDir, "renders");
  const reportsDir = join(runDir, "reports");
  for (const dir of [sourceDir, irDir, genDir, fontsDir, rendersDir, reportsDir]) {
    mkdirSync(dir, { recursive: true });
  }

  console.log(`Run: ${runId}`);

  // 1. Extract (figma-client)
  const client = new FigmaClient({ token });
  const response = await client.getFileNodes(FILE_KEY, [NODE_ID]);
  const entry = response.nodes[NODE_ID];
  if (!entry) throw new Error(`Node ${NODE_ID} not present in response`);
  writeFileSync(join(sourceDir, "figma-node.json"), JSON.stringify(entry, null, 2));

  // 2. Parse -> NodeIR (figma-parser)
  const parsed = parseDocument(entry.document, {
    figmaFileVersion: response.version,
    parserVersion: "0.0.0",
  });

  // 3. Validate (design-ir)
  const doc = validateDocument(parsed);
  writeFileSync(join(irDir, "design-ir.json"), JSON.stringify(doc, null, 2));
  console.log(`Parsed + validated ${Object.keys(doc.nodes).length} nodes.`);

  // 4. Resolve fonts (font-engine) -- real font files, no silent substitution.
  const fonts = distinctFonts(doc);
  const fontFaceBlocks: string[] = [];
  const fontHashes: string[] = [];
  for (const font of fonts) {
    const cached = await resolveAndCacheFont(
      font.fontFamily,
      font.fontWeight,
      font.fontStyle,
      fontsDir,
    );
    fontFaceBlocks.push(cached.cssText);
    fontHashes.push(...cached.sha256s);
  }
  console.log(`Resolved ${fonts.length} distinct font(s), ${fontHashes.length} font file(s).`);

  // 5. Generate HTML/CSS (code-generator)
  const html = generateHtml(doc);
  const css = `${fontFaceBlocks.join("\n\n")}\n\n${generateCss(doc)}`;
  writeFileSync(join(genDir, "index.html"), html);
  writeFileSync(join(genDir, "styles.css"), css);

  // 6. Render (renderer) -- readiness-gated screenshot.
  const renderer = new Renderer();
  await renderer.launch();
  let renderResult;
  try {
    renderResult = await renderer.render({
      htmlPath: join(genDir, "index.html"),
      viewport: VIEWPORT,
      screenshotPath: join(rendersDir, `${VIEWPORT.width}x${VIEWPORT.height}.png`),
    });
  } finally {
    const provenance = renderer.getProvenance();
    await renderer.close();

    // 7. Manifest (PRD §14.1 / §14.10 reproducibility inputs)
    const manifest = {
      runId,
      figmaFileKey: FILE_KEY,
      figmaNodeId: NODE_ID,
      figmaFileVersion: response.version,
      parserVersion: "0.0.0",
      generatorVersion: "0.0.0",
      viewport: VIEWPORT,
      dpr: 1,
      fontHashes,
      render: provenance,
      createdAt: new Date().toISOString(),
    };
    writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  }

  writeFileSync(
    join(reportsDir, "run.json"),
    JSON.stringify(
      { runId, status: "READY_SCREENSHOT", screenshot: renderResult?.screenshotPath },
      null,
      2,
    ),
  );

  console.log(`Screenshot: ${renderResult?.screenshotPath}`);
  console.log(`Run complete: ${runDir}`);
}

main().catch((error) => {
  console.error("FAILED:", error.code ?? error.name, "-", error.message);
  process.exitCode = 1;
});
