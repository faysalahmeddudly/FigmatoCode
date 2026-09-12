import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import type { RootCauseEvidence } from "@figma-engine/root-cause-engine";
import type { SolverContext } from "./context.js";

const CROSS_AXIS_TOLERANCE_PX = 0.5;

// Fixed enumeration order (not derived from the zod schema at runtime) so candidate ordering
// stays deterministic independent of schema declaration order.
const ALIGN_VALUES = ["START", "CENTER", "END", "STRETCH"] as const;

// PRD §6.1/§16.5: alignment is discrete, not numeric -- the "candidate set" is every other
// value of the enum rather than a bounded delta around a measured number. Only proposed when
// the diagnosed error is on the parent's cross axis (the axis `align` actually controls);
// a main-axis error is gap/position territory, not alignment's.
export function generateAlignmentCandidates(
  evidence: RootCauseEvidence,
  doc: DesignDocument,
  context: SolverContext,
): Patch[] {
  if (evidence.rootCause !== "POSITION") return [];
  if (!evidence.geometryDiff) return [];

  const node = doc.nodes[evidence.nodeId];
  if (!node?.parentId) return [];

  const parent = doc.nodes[node.parentId];
  if (!parent || parent.layout.mode !== "AUTO_LAYOUT" || !parent.layout.axis) return [];

  const crossAxisDelta =
    parent.layout.axis === "HORIZONTAL" ? evidence.geometryDiff.dy : evidence.geometryDiff.dx;
  if (Math.abs(crossAxisDelta) < CROSS_AXIS_TOLERANCE_PX) return [];

  // CSS flex containers default to align-items:stretch when unset (§14.6), so an absent
  // `align` is treated as the current value "STRETCH" for diffing purposes.
  const oldValue = parent.layout.align ?? "STRETCH";

  return ALIGN_VALUES.filter((v) => v !== oldValue).map((newValue) => ({
    id: `align:${parent.identity.internalId}:${oldValue}->${newValue}`,
    targetNodeId: parent.identity.internalId,
    targetScope: "PARENT",
    property: "layout.align",
    oldValue,
    newValue,
    reason: `Child "${evidence.nodeId}" is off by ${crossAxisDelta.toFixed(2)}px on the parent's cross axis`,
    evidence: [{ kind: "geometry-diff", detail: evidence.geometryDiff }],
    scoreBefore: context.scoreBefore,
    parentVersionId: context.parentVersionId,
    status: "PROPOSED",
  }));
}
