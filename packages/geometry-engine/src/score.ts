import type { DesignDocument } from "@figma-engine/shared-contracts";
import type { GeometryDiff } from "./diff.js";

// PRD §15.4: weights (and the exact per-dimension normalization) are "benchmark-calibrated
// before Phase 3 exit" -- this is a defensible v1, not the final calibrated formula. Absolute
// geometry is used as required by §15.3 ("absolute geometry remains the final verification
// metric"). Error is normalized against each node's own diagonal so a few px of error on a
// small icon counts for more than the same error on a large frame.
export function computeGeometryScore(diffs: GeometryDiff[], doc: DesignDocument): number {
  const perNodeScores: number[] = [];

  for (const diff of diffs) {
    const node = doc.nodes[diff.nodeId];
    if (!node) continue;
    const diagonal = Math.hypot(node.absolute.width, node.absolute.height);
    if (diagonal === 0) continue;

    const positionError = Math.hypot(diff.dx, diff.dy);
    const sizeError = Math.hypot(diff.dw, diff.dh);
    const combinedError = (positionError + sizeError) / 2;

    const score = 100 * Math.max(0, 1 - combinedError / diagonal);
    perNodeScores.push(score);
  }

  if (perNodeScores.length === 0) return 0;
  return perNodeScores.reduce((sum, s) => sum + s, 0) / perNodeScores.length;
}
