export interface AcceptanceInput {
  scoreBefore: number;
  scoreAfter: number;
  hasCriticalRegression: boolean;
  candidateValid: boolean;
  renderReady: boolean;
}

// PRD §15.5: a candidate is eligible for commit only when scoreAfter > scoreBefore +
// improvementThreshold AND no critical regression exists AND the candidate is valid AND the
// render completed under the readiness contract. Every commit path must call this same gate
// -- there is exactly one place this decision is made.
export const DEFAULT_IMPROVEMENT_THRESHOLD = 0.05;

export function isAcceptable(
  input: AcceptanceInput,
  improvementThreshold = DEFAULT_IMPROVEMENT_THRESHOLD,
): boolean {
  if (!input.candidateValid) return false;
  if (!input.renderReady) return false;
  if (input.hasCriticalRegression) return false;
  return input.scoreAfter > input.scoreBefore + improvementThreshold;
}
