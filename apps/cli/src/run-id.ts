import { createHash, randomBytes } from "node:crypto";

// PRD §14.1: run IDs are determinism-traceable. When given a seed (e.g. fileKey+nodeId
// combination) we use a content-hash prefix for reproducibility tracing; otherwise we
// fall back to a random hex suffix so concurrent runs never collide.
export function makeRunId(seed?: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  if (seed) {
    const hash = createHash("sha256").update(seed).digest("hex").slice(0, 8);
    return `run-${ts}-${hash}`;
  }
  return `run-${ts}-${randomBytes(4).toString("hex")}`;
}
