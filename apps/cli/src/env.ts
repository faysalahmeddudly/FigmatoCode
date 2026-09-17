// Reads and validates secrets from the environment (via dotenv, loaded at CLI entry).
// FIGMA_TOKEN is never logged, persisted into IR/artifacts, or passed through any
// path other than this module → FigmaClient. (PRD §24)

import { config } from "dotenv";

config(); // load .env if present; no-op if already set

export function requireFigmaToken(): string {
  const token = process.env["FIGMA_TOKEN"];
  if (!token) {
    console.error(
      "Error: FIGMA_TOKEN is not set. Add it to .env or export it before running.",
    );
    process.exit(1);
  }
  return token;
}
