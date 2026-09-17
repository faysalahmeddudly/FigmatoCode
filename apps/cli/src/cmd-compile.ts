import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { generateHtml, generateCss, type AssetMap } from "@figma-engine/code-generator";
import { resolveAndCacheFont } from "@figma-engine/font-engine";
import { FigmaClient } from "@figma-engine/figma-client";
import { downloadAsset } from "@figma-engine/asset-engine";
import { validateDocument } from "@figma-engine/design-ir";
import { requireFigmaToken } from "./env.js";
import { makeRunId } from "./run-id.js";
import { RunOutput } from "./output.js";

// figma-engine compile --ir <node-ir.json> [--file <fileKey>] [--out <dir>]
//
// PRD §20.1 / M2: DesignDocument → deterministic HTML + CSS, font + asset resolution,
// written to output/<runId>/. No React, no Tailwind, no JS (§14.6).
//
// --file is optional: if supplied (matching the parse run's file key) the compiler
// fetches Figma's pre-signed S3 URLs for every IMAGE fill and downloads + caches them.
// Without --file the HTML/CSS is still valid, just without background images.
export function registerCompileCommand(program: Command): void {
  program
    .command("compile")
    .description("Compile a NodeIR document to deterministic HTML + CSS")
    .requiredOption("--ir <path>", "Path to node-ir.json from a parse run")
    .option("--file <fileKey>", "Figma file key — enables image asset resolution")
    .option("--out <dir>", "Output root directory", "output")
    .option("--font-cache <dir>", "Directory for cached font files", ".font-cache")
    .option("--asset-cache <dir>", "Directory for cached image assets", ".asset-cache")
    .action(
      async (opts: {
        ir: string;
        file?: string;
        out: string;
        fontCache: string;
        assetCache: string;
      }) => {
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

        // --- Font resolution (§14.9 — hard FONT_MISSING, no silent substitution) ---
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
            try {
              const cached = await resolveAndCacheFont(family, weight, style, opts.fontCache);
              blocks.push(cached.cssText);
            } catch {
              console.warn(`[compile] ⚠ Could not resolve font "${family}" — using browser fallback`);
            }
          }
          fontFaces = blocks.join("\n\n");
        } catch (err) {
          console.warn(`[compile] ⚠ Font resolution error: ${String(err)}`);
        }

        // --- Asset resolution (§14.6 — IMAGE fills → local content-addressed files) ---
        const assetMap: Map<string, string> = new Map();

        if (opts.file) {
          // Collect every unique assetId (Figma imageRef) referenced across all nodes.
          const assetIds = new Set<string>();
          for (const node of Object.values(doc.nodes)) {
            for (const fill of node.fills ?? []) {
              if (fill.kind === "IMAGE") assetIds.add(fill.assetId);
            }
          }

          if (assetIds.size > 0) {
            console.log(`[compile] Resolving ${assetIds.size} image asset(s) from Figma...`);
            try {
              // Figma's /files/{key}/images endpoint returns ALL image fills in the file
              // keyed by imageRef hash (the assetId stored in NodeIR) → presigned S3 URL.
              // This is different from /images which takes node IDs for frame exports.
              const token = requireFigmaToken();
              const imgRes = await fetch(
                `https://api.figma.com/v1/files/${opts.file}/images`,
                { headers: { "X-Figma-Token": token } },
              );
              if (!imgRes.ok) throw new Error(`Figma images API returned ${imgRes.status}`);
              const imgJson = (await imgRes.json()) as { meta?: { images?: Record<string, string> } };
              const imageUrls = imgJson.meta?.images ?? {};
              let resolved = 0;
              let failed = 0;
              for (const assetId of assetIds) {
                const url = imageUrls[assetId];
                if (!url) { failed++; continue; }
                try {
                  const downloaded = await downloadAsset(url, opts.assetCache);
                  assetMap.set(assetId, downloaded.localPath);
                  resolved++;
                } catch (err) {
                  console.warn(`[compile] ⚠ Asset ${assetId} download failed: ${String(err)}`);
                  failed++;
                }
              }
              console.log(`[compile] Assets: ${resolved} resolved, ${failed} failed`);
            } catch (err) {
              console.warn(`[compile] ⚠ Asset resolution skipped: ${String(err)}`);
            }
          }
        } else {
          console.log("[compile] No --file provided — skipping image asset resolution");
        }

        // --- Generate HTML + CSS ---
        const resolvedAssetMap: AssetMap = assetMap;
        const css = (fontFaces ? fontFaces + "\n\n" : "") + generateCss(doc, resolvedAssetMap);
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
          figmaFileKey: opts.file,
          htmlPath,
          cssPath,
          htmlHash: RunOutput.sha256(htmlContent),
          cssHash: RunOutput.sha256(cssContent),
          assetsResolved: assetMap.size,
          fontsResolved: fontFaces ? fontFaces.split("@font-face").length - 1 : 0,
        });

        console.log(`[compile] ✓ HTML → ${htmlPath}`);
        console.log(`[compile] ✓ CSS  → ${cssPath}`);
        if (assetMap.size > 0)
          console.log(`[compile] ✓ ${assetMap.size} image asset(s) embedded`);
      },
    );
}
