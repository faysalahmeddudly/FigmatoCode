import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import type { RootCauseEvidence } from "@figma-engine/root-cause-engine";
import type { SolverContext } from "./context.js";

const NEARBY_DELTA_PX = 1;
const MIN_ERROR_PX = 0.5;

function boundedCandidates(exact: number): number[] {
  const rounded = (v: number) => Math.max(0, Math.round(v * 100) / 100);
  const values = [
    rounded(exact),
    rounded(exact - NEARBY_DELTA_PX),
    rounded(exact + NEARBY_DELTA_PX),
  ];
  return [...new Set(values)];
}

// PRD §6.1/§16.5: gap, a bounded set around the exact correction rather than optimizer's
// Phase 2 single-hypothesis gap rule (gap-candidate-rule.ts). Simplification carried over
// from that rule: uses the affected child's main-axis absolute error as a proxy for the
// parent's gap error, exact when the parent has no diff of its own and only one gap
// separates the child from its previous sibling.
export function generateGapCandidates(
  evidence: RootCauseEvidence,
  doc: DesignDocument,
  context: SolverContext,
): Patch[] {
  if (evidence.rootCause !== "POSITION") return [];
  if (!evidence.geometryDiff) return [];

  const node = doc.nodes[evidence.nodeId];
  if (!node?.parentId) return [];

  const parent = doc.nodes[node.parentId];
  if (!parent || parent.layout.mode !== "AUTO_LAYOUT" || parent.layout.gap === undefined) {
    return [];
  }

  const mainAxisDelta =
    parent.layout.axis === "HORIZONTAL" ? evidence.geometryDiff.dx : evidence.geometryDiff.dy;
  if (Math.abs(mainAxisDelta) < MIN_ERROR_PX) return [];

  const oldGap = parent.layout.gap;
  const newGaps = boundedCandidates(oldGap - mainAxisDelta).filter((v) => v !== oldGap);

  return newGaps.map((newGap) => ({
    id: `gap:${parent.identity.internalId}:${oldGap}->${newGap}`,
    targetNodeId: parent.identity.internalId,
    targetScope: "PARENT",
    property: "layout.gap",
    oldValue: oldGap,
    newValue: newGap,
    reason: `Child "${evidence.nodeId}" is off by ${mainAxisDelta.toFixed(2)}px along the parent's ${parent.layout.axis} axis`,
    evidence: [{ kind: "geometry-diff", detail: evidence.geometryDiff }],
    scoreBefore: context.scoreBefore,
    parentVersionId: context.parentVersionId,
    status: "PROPOSED",
  }));
}
