import "dotenv/config";
import { writeFileSync } from "node:fs";
import { FigmaClient } from "../packages/figma-client/dist/index.js";
import { parseDocument } from "../packages/figma-parser/dist/index.js";

const FILE_KEY = "si0LCoBsffi63CK8doDsO4";
const NODE_ID = "21:16041";

async function main() {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN is not set in .env");

  const client = new FigmaClient({ token });
  const response = await client.getFileNodes(FILE_KEY, [NODE_ID]);

  const entry = response.nodes[NODE_ID];
  if (!entry) throw new Error(`Node ${NODE_ID} not present in response`);

  writeFileSync("scripts/raw-node-response.json", JSON.stringify(entry, null, 2));
  console.log(
    `Raw response saved. Root node type: ${entry.document.type}, name: ${entry.document.name}`,
  );

  const parsed = parseDocument(entry.document, {
    figmaFileVersion: response.version,
    parserVersion: "0.0.0",
  });

  writeFileSync("scripts/parsed-node-ir.json", JSON.stringify(parsed, null, 2));
  console.log(
    `Parsed ${Object.keys(parsed.nodes).length} nodes. Root internalId: ${parsed.rootId}`,
  );
}

main().catch((error) => {
  console.error("FAILED:", error.code ?? error.name, "-", error.message);
  process.exitCode = 1;
});
