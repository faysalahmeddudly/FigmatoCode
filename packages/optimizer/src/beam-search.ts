import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import { attemptPatch, type EvaluationResult } from "./optimizer-loop.js";

export interface BeamSearchConfig {
  beamWidth?: number;
  maxIterations?: number;
}

export interface BeamState {
  doc: DesignDocument;
  score: number;
  robustness: number;
  patches: Patch[];
}

export interface BeamSearchResult {
  best: BeamState;
  iterationsRun: number;
}

const DEFAULT_BEAM_WIDTH = 3;
const DEFAULT_MAX_ITERATIONS = 20;

// PRD §16.6 tie-break order: Fidelity -> Robustness -> patch count -> lexicographic patch ID.
// Negative means `a` ranks ahead of `b`, so sorting with this comparator puts the best state
// first.
function compareBeamStates(a: BeamState, b: BeamState): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.robustness !== b.robustness) return b.robustness - a.robustness;
  if (a.patches.length !== b.patches.length) return a.patches.length - b.patches.length;
  const aId = a.patches.at(-1)?.id ?? "";
  const bId = b.patches.at(-1)?.id ?? "";
  return aId < bId ? -1 : aId > bId ? 1 : 0;
}

// PRD §16.6 beam search over layout-solver's (or any) candidate generator, plus §6.2 "best
// version always survives": `best` starts as the untouched input state and is only ever
// replaced by a state reached exclusively through §15.5-eligible steps (attemptPatch's own
// acceptance gate, applied per patch) -- every accepted step is a strict Fidelity improvement
// over its parent, so the search is monotonically non-decreasing along any surviving branch.
// If every branch dies out (no candidate clears the acceptance threshold anywhere) or
// `maxIterations` is reached first, whatever was last found is returned -- never a
// regression below the input.
export async function beamSearch(
  initialDoc: DesignDocument,
  initialScore: number,
  generateCandidates: (doc: DesignDocument, scoreBefore: number) => Patch[],
  evaluate: (doc: DesignDocument) => Promise<EvaluationResult>,
  config: BeamSearchConfig = {},
): Promise<BeamSearchResult> {
  const beamWidth = config.beamWidth ?? DEFAULT_BEAM_WIDTH;
  const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  let best: BeamState = { doc: initialDoc, score: initialScore, robustness: 0, patches: [] };
  let beam: BeamState[] = [best];
  let iterationsRun = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterationsRun = i + 1;
    const nextBeam: BeamState[] = [];

    for (const state of beam) {
      const candidates = generateCandidates(state.doc, state.score);
      for (const candidatePatch of candidates) {
        const outcome = await attemptPatch(state.doc, candidatePatch, evaluate);
        // Eligibility invariant (§16.6): only §15.5-eligible candidates enter the beam --
        // attemptPatch already applies that same gate before returning COMMITTED.
        if (!outcome.record.accepted) continue;

        nextBeam.push({
          doc: outcome.resultingDoc,
          score: outcome.record.scoreAfter ?? state.score,
          robustness: outcome.finalPatch.robustnessAfter ?? state.robustness,
          patches: [...state.patches, outcome.finalPatch],
        });
      }
    }

    if (nextBeam.length === 0) break;

    nextBeam.sort(compareBeamStates);
    beam = nextBeam.slice(0, beamWidth);

    if (compareBeamStates(beam[0]!, best) < 0) {
      best = beam[0]!;
    }
  }

  return { best, iterationsRun };
}
