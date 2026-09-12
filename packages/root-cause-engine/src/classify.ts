import type { NodeIR, RootCauseClass } from "@figma-engine/shared-contracts";

// Structurally compatible with geometry-engine's GeometryDiff -- accepted by shape rather
// than as a hard package dependency, per root-cause-engine's §25 role (explain diff
// patterns, not own another engine's types).
export interface GeometryDiffInput {
  nodeId: string;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

const POSITION_TOLERANCE_PX = 1;
const SIZE_TOLERANCE_PX = 1;

// PRD §16.1 step 5, classification. This is deliberately conservative: only POSITION, SIZE,
// and TYPOGRAPHY (for text nodes with a geometry deviation) are positively evidenced by what
// geometry-engine can currently measure. GAP/PADDING/ALIGNMENT would require comparing
// reference vs. candidate LayoutIR properties directly (not built yet), and
// GRADIENT/SHADOW/BLUR/CLIP_MASK/COMPOSITING/STACKING/TRANSFORM all require a visual/
// compositing engine that doesn't exist yet either (Phase 3). Claiming any of those without
// real supporting evidence would be exactly the silent approximation §32.2 forbids -- a diff
// with no geometry deviation (a pure pixel/color difference) is classified UNKNOWN, which
// correctly routes to UNRESOLVED_SOURCE_AMBIGUITY rather than a confident-sounding guess.
export function classifyRootCause(
  node: NodeIR,
  diff: GeometryDiffInput | undefined,
): RootCauseClass {
  if (!diff) return "UNKNOWN";

  const positionError = Math.hypot(diff.dx, diff.dy);
  const sizeError = Math.hypot(diff.dw, diff.dh);

  if (positionError <= POSITION_TOLERANCE_PX && sizeError <= SIZE_TOLERANCE_PX) {
    return "UNKNOWN";
  }
  if (node.type === "TEXT") {
    return "TYPOGRAPHY";
  }
  return sizeError > positionError ? "SIZE" : "POSITION";
}
