import { readFile, writeFile } from "node:fs/promises";
import type { Command } from "commander";
import { FigmaClient } from "@figma-engine/figma-client";
import { parseDocument } from "@figma-engine/figma-parser";
import { validateDocument } from "@figma-engine/design-ir";
import { requireFigmaToken } from "./env.js";
import { makeRunId } from "./run-id.js";
import { RunOutput } from "./output.js";

// figma-engine parse --file <fileKey> --node <nodeId> [--out <dir>]
//
// PRD §20.1 / M1 gate: fetch the Figma node, traverse → NodeIR, validate, write
// output/<runId>/node-ir.json + manifest.json. Exits non-zero on any typed failure.
export function registerParseCommand(program: Command): void {
  program
    .command("parse")
    .description("Fetch a Figma node and emit a validated NodeIR document")
    .requiredOption("--file <fileKey>", "Figma file key")
    .requiredOption("--node <nodeId>", "Figma node ID")
    .option("--out <dir>", "Output root directory", "output")
    .action(async (opts: { file: string; node: string; out: string }) => {
      const token = requireFigmaToken();
      const runId = makeRunId(`${opts.file}:${opts.node}`);
      const out = new RunOutput(runId, opts.out);
      await out.init();

      console.log(`[parse] run=${runId} file=${opts.file} node=${opts.node}`);

      const databaseUrl = process.env.DATABASE_URL;
      const client = new FigmaClient({ token, databaseUrl });

      let nodesResponse: Awaited<ReturnType<typeof client.getFileNodes>>;
      try {
        nodesResponse = await client.getFileNodes(opts.file, [opts.node]);
      } catch (err) {
        console.error(`[parse] Figma API error: ${String(err)}`);
        process.exit(2);
      }

      const nodeData = nodesResponse.nodes[opts.node];
      if (!nodeData) {
        console.error(`[parse] Node ${opts.node} not found in response`);
        process.exit(2);
      }

      const figmaFileVersion = nodesResponse.version ?? "unknown";

      const rawDoc = parseDocument(nodeData.document, {
        figmaFileVersion,
        parserVersion: "0.0.0",
      });

      let doc: ReturnType<typeof validateDocument>;
      try {
        doc = validateDocument(rawDoc);
      } catch (err) {
        console.error(`[parse] NodeIR validation failed: ${String(err)}`);
        process.exit(3);
      }

      const irJson = JSON.stringify(doc, null, 2) + "\n";
      const irPath = await out.write("node-ir.json", irJson);

      await out.writeManifest({
        runId,
        figmaFileKey: opts.file,
        figmaNodeId: opts.node,
        generatorVersion: "0.0.0",
        startedAt: new Date().toISOString(),
        nodeIrHash: RunOutput.sha256(irJson),
        nodeIrPath: irPath,
        figmaFileVersion,
        nodeCount: Object.keys(doc.nodes).length,
      });

      console.log(`[parse] ✓ ${Object.keys(doc.nodes).length} nodes → ${irPath}`);
    });
}

// Utility: load and validate a node-ir.json from a previous parse run.
export async function loadNodeIr(
  irPath: string,
): Promise<ReturnType<typeof validateDocument>> {
  const raw = await readFile(irPath, "utf-8");
  return validateDocument(JSON.parse(raw));
}
