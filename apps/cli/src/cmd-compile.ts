import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { generateHtml, generateCss } from "@figma-engine/code-generator";
import { resolveAndCacheFont } from "@figma-engine/font-engine";
import { validateDocument } from "@figma-engine/design-ir";
import { makeRunId } from "./run-id.js";
import { RunOutput } from "./output.js";

// figma-engine compile --ir <node-ir.json> [--out <dir>]
//
// PRD §20.1 / M2: DesignDocument → deterministic HTML + CSS, font resolution,
// written to output/<runId>/. No React, no Tailwind, no JS (§14.6).
export function registerCompileCommand(program: Command): void {
  program
    .command("compile")
    .description("Compile a NodeIR document to deterministic HTML + CSS")
    .requiredOption("--ir <path>", "Path to node-ir.json from a parse run")
    .option("--out <dir>", "Output root directory", "output")
    .option("--font-cache <dir>", "Directory for cached font files", ".font-cache")
    .action(async (opts: { ir: string; out: string; fontCache: string }) => {
      const runId = makeRunId(opts.ir);
      const out = new RunOutput(runId, opts.out);
      await out.init();

      console.log(`[compile] run=${runId} ir=${opts.ir}`);

      const raw = await readFile(opts.ir, "utf-8");
      let doc: ReturnType<typeof validateDocument>;
      try {
        doc = validateDocument(JSON.parse(raw));
      } catch (err) {
        console.error(`[compile] Invalid node-ir.json: ${String(err)}`);
        process.exit(3);
      }

      // Font resolution: resolve every unique font referenced in doc's typography nodes.
      // Hard FONT_MISSING error on any unresolvable font (§14.9).
      let fontFaces = "";
      try {
        const uniqueFonts = new Map<string, { weight: number; style: "normal" | "italic" }>();
        for (const node of Object.values(doc.nodes)) {
          if (node.typography) {
            const key = `${node.typography.fontFamily}-${node.typography.fontWeight}-${node.typography.fontStyle}`;
            uniqueFonts.set(key, {
              weight: node.typography.fontWeight ?? 400,
              style: (node.typography.fontStyle === "italic" ? "italic" : "normal") as
                | "normal"
                | "italic",
            });
          }
        }
        const blocks: string[] = [];
        for (const [key, { weight, style }] of uniqueFonts) {
          const family = key.split("-")[0] ?? "";
          if (!family) continue;
          const cached = await resolveAndCacheFont(family, weight, style, opts.fontCache);
          blocks.push(cached.cssText);
        }
        fontFaces = blocks.join("\n\n");
      } catch (err) {
        console.error(`[compile] Font resolution failed: ${String(err)}`);
        process.exit(4);
      }

      const css = generateCss(doc);
      const html = generateHtml(doc);

      const cssContent = css + "\n";
      const htmlContent = html + "\n";

      const cssPath = await out.write("styles.css", cssContent);
      const htmlPath = await out.write("index.html", htmlContent);

      await out.writeManifest({
        runId,
        generatorVersion: "0.0.0",
        startedAt: new Date().toISOString(),
        sourceIr: opts.ir,
        htmlPath,
        cssPath,
        htmlHash: RunOutput.sha256(htmlContent),
        cssHash: RunOutput.sha256(cssContent),
      });

      console.log(`[compile] ✓ HTML → ${htmlPath}`);
      console.log(`[compile] ✓ CSS  → ${cssPath}`);
    });
}
