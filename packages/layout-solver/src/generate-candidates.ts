import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import type { RootCauseEvidence } from "@figma-engine/root-cause-engine";
import type { SolverContext } from "./context.js";
import { generateWidthCandidates, generateHeightCandidates } from "./size-candidates.js";
import { generateGapCandidates } from "./gap-candidates.js";
import { generateAlignmentCandidates } from "./alignment-candidates.js";

// PRD §6.1: "one hypothesis dimension at a time unless an explicit coupled rule is
// registered" -- no coupled rule exists yet, so every candidate here changes exactly one
// property. Dimension order (width, gap, alignment, height) is fixed so the overall
// candidate list -- and therefore beam search's traversal order given equal scores -- is
// deterministic across runs.
export function generateCandidates(
  evidence: RootCauseEvidence,
  doc: DesignDocument,
  context: SolverContext,
): Patch[] {
  return [
    ...generateWidthCandidates(evidence, doc, context),
    ...generateGapCandidates(evidence, doc, context),
    ...generateAlignmentCandidates(evidence, doc, context),
    ...generateHeightCandidates(evidence, doc, context),
  ];
}
