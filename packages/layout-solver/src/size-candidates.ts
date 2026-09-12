import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import type { GeometryDiffInput, RootCauseEvidence } from "@figma-engine/root-cause-engine";
import type { SolverContext } from "./context.js";

const NEARBY_DELTA_PX = 1;
const MIN_ERROR_PX = 0.5;

function boundedCandidates(exact: number): number[] {
  const rounded = (v: number) => Math.max(0, Math.round(v * 100) / 100);
  // Deterministic order: exact correction first, then the bounded neighbors, per §16.5
  // "measuredValue, measuredValue +/- bounded nearby deltas". The exact value is tried first
  // because it's the best single hypothesis; the neighbors exist because rounding and
  // font-metric sub-pixel effects mean the naive exact correction isn't always the true
  // optimum -- beam search (optimizer) is what actually decides, this just proposes.
  const values = [
    rounded(exact),
    rounded(exact - NEARBY_DELTA_PX),
    rounded(exact + NEARBY_DELTA_PX),
  ];
  return [...new Set(values)];
}

function generateSizeCandidates(
  evidence: RootCauseEvidence,
  doc: DesignDocument,
  context: SolverContext,
  dimension: "width" | "height",
  pickDelta: (diff: GeometryDiffInput) => number,
): Patch[] {
  if (evidence.rootCause !== "SIZE") return [];
  if (!evidence.geometryDiff) return [];

  const node = doc.nodes[evidence.nodeId];
  if (!node) return [];
  // FILL/HUG sizing is derived from the parent/content, not a settable fixed dimension --
  // only FIXED sizing (§14.6) has a measured value that can be directly patched.
  if (node.layout.sizing && node.layout.sizing[dimension] !== "FIXED") return [];

  const delta = pickDelta(evidence.geometryDiff);
  if (Math.abs(delta) < MIN_ERROR_PX) return [];

  // computeAbsoluteChildSizing/computeChildSizing (code-generator) read `absolute.<dim>` for
  // FIXED sizing, not `relative.<dim>` -- patching `relative` would leave the generated CSS
  // untouched and silently do nothing.
  const oldValue = node.absolute[dimension];
  const newValues = boundedCandidates(oldValue - delta).filter((v) => v !== oldValue);

  return newValues.map((newValue) => ({
    id: `${dimension}:${node.identity.internalId}:${oldValue}->${newValue}`,
    targetNodeId: node.identity.internalId,
    targetScope: "NODE",
    property: `absolute.${dimension}`,
    oldValue,
    newValue,
    reason: `Node "${evidence.nodeId}" measured ${dimension} is off by ${delta.toFixed(2)}px`,
    evidence: [{ kind: "geometry-diff", detail: evidence.geometryDiff }],
    scoreBefore: context.scoreBefore,
    parentVersionId: context.parentVersionId,
    status: "PROPOSED",
  }));
}

// PRD §6.1/§16.5 type-specific candidate generation: width, one hypothesis dimension at a
// time (no coupled width+height rule is registered yet).
export function generateWidthCandidates(
  evidence: RootCauseEvidence,
  doc: DesignDocument,
  context: SolverContext,
): Patch[] {
  return generateSizeCandidates(evidence, doc, context, "width", (d) => d.dw);
}

export function generateHeightCandidates(
  evidence: RootCauseEvidence,
  doc: DesignDocument,
  context: SolverContext,
): Patch[] {
  return generateSizeCandidates(evidence, doc, context, "height", (d) => d.dh);
}
