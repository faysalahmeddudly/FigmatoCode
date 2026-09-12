import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import type { RootCauseEvidence } from "@figma-engine/root-cause-engine";

export interface GapRuleContext {
  scoreBefore: number;
  parentVersionId: string;
}

// PRD §16.5 "Gap: measuredValue, measuredValue +/- bounded nearby deltas" and the §12A.3
// example patch (gap 16px -> 24px). This is Phase 2's rule-based mode: a single deterministic
// hypothesis derived directly from evidence, not the type-specific bounded *search* over
// several candidates that Phase 3's layout-solver adds.
//
// Simplification, documented: the rule uses the affected child's ABSOLUTE position error
// (dx/dy) as a proxy for how far the parent's gap is off, rather than fully disentangling
// relative-to-parent drift across multiple siblings. That's exact when the parent itself has
// no diff of its own and only one gap separates the child from its previous sibling; a
// multi-child cumulative-drift case is a Phase 3 concern (bounded search), not this rule's.
export function proposeGapAdjustment(
  evidence: RootCauseEvidence,
  doc: DesignDocument,
  context: GapRuleContext,
): Patch | undefined {
  if (evidence.rootCause !== "POSITION") return undefined;
  if (!evidence.geometryDiff) return undefined;

  const node = doc.nodes[evidence.nodeId];
  if (!node?.parentId) return undefined;

  const parent = doc.nodes[node.parentId];
  if (!parent || parent.layout.mode !== "AUTO_LAYOUT" || parent.layout.gap === undefined) {
    return undefined;
  }

  const mainAxisDelta =
    parent.layout.axis === "HORIZONTAL" ? evidence.geometryDiff.dx : evidence.geometryDiff.dy;
  if (Math.abs(mainAxisDelta) < 0.5) return undefined;

  const oldGap = parent.layout.gap;
  const newGap = Math.max(0, Math.round((oldGap - mainAxisDelta) * 100) / 100);
  if (newGap === oldGap) return undefined;

  return {
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
  };
}
