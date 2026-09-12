// Shared with optimizer's Phase 2 rule (gap-candidate-rule.ts): the caller supplies the
// pre-patch Fidelity score and the version this candidate branches from, since layout-solver
// itself never scores or renders anything (§25: this package proposes, it does not measure).
export interface SolverContext {
  scoreBefore: number;
  parentVersionId: string;
}
