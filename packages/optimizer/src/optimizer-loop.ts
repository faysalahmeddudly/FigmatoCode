import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import { applyPatch, proposePatch, transitionPatch } from "@figma-engine/patch-engine";
import { isAcceptable } from "./score-acceptance.js";
import type { PatchAttemptRecord } from "./regression-log.js";

export interface EvaluationResult {
  fidelityScore: number;
  hasCriticalRegression: boolean;
  renderReady: boolean;
}

export interface PatchAttemptOutcome {
  resultingDoc: DesignDocument;
  finalPatch: Patch;
  record: PatchAttemptRecord;
}

// PRD §25: "optimizer: Select and evaluate deterministic candidates / must not: Bypass
// measurement." `evaluate` is the real measurement (render + geometry/visual comparison +
// Fidelity score) supplied by the caller -- this loop never fabricates a score itself, and a
// failed evaluation is treated as a critical regression rather than silently ignored.
//
// Sequence per §16.2/§16.3: PROPOSED -> APPLIED (mutation-boundary gate, patch-engine) ->
// [apply -> evaluate] -> EVALUATED -> COMMITTED or ROLLED_BACK (§15.5 acceptance, this
// package's one gate function).
export async function attemptPatch(
  doc: DesignDocument,
  patch: Patch,
  evaluate: (candidateDoc: DesignDocument) => Promise<EvaluationResult>,
): Promise<PatchAttemptOutcome> {
  const proposed = proposePatch(patch);

  if (proposed.status === "REJECTED") {
    return {
      resultingDoc: doc,
      finalPatch: proposed,
      record: { patch: proposed, accepted: false, scoreBefore: patch.scoreBefore },
    };
  }

  const candidateDoc = applyPatch(doc, proposed);

  let evaluation: EvaluationResult;
  let candidateValid = true;
  try {
    evaluation = await evaluate(candidateDoc);
  } catch {
    candidateValid = false;
    evaluation = {
      fidelityScore: patch.scoreBefore,
      hasCriticalRegression: true,
      renderReady: false,
    };
  }

  const evaluated = transitionPatch(proposed, "EVALUATED");
  const scored: Patch = { ...evaluated, scoreAfter: evaluation.fidelityScore };

  const accepted = isAcceptable({
    scoreBefore: patch.scoreBefore,
    scoreAfter: evaluation.fidelityScore,
    hasCriticalRegression: evaluation.hasCriticalRegression,
    candidateValid,
    renderReady: evaluation.renderReady,
  });

  const finalPatch = transitionPatch(scored, accepted ? "COMMITTED" : "ROLLED_BACK");

  return {
    resultingDoc: accepted ? candidateDoc : doc,
    finalPatch,
    record: {
      patch: finalPatch,
      accepted,
      scoreBefore: patch.scoreBefore,
      scoreAfter: evaluation.fidelityScore,
    },
  };
}
