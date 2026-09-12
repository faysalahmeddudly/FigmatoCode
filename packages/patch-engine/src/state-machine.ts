import { PATCH_STATE_TRANSITIONS, type Patch } from "@figma-engine/shared-contracts";
import { isMutationPermitted } from "./mutation-boundaries.js";

export class InvalidPatchTransitionError extends Error {
  constructor(
    readonly from: Patch["status"],
    readonly to: Patch["status"],
  ) {
    super(`Invalid patch transition: ${from} -> ${to}`);
    this.name = "InvalidPatchTransitionError";
  }
}

// PRD §16.3 state machine, enforced generically -- any transition not listed in
// PATCH_STATE_TRANSITIONS (shared-contracts) is rejected rather than silently allowed.
export function transitionPatch(patch: Patch, next: Patch["status"]): Patch {
  const allowed = PATCH_STATE_TRANSITIONS[patch.status];
  if (!allowed.includes(next)) {
    throw new InvalidPatchTransitionError(patch.status, next);
  }
  return { ...patch, status: next };
}

// PRD §16.3 "PROPOSED -> REJECTED when schema/boundary validation fails": the mutation-
// boundary gate from §16.4 decides whether a PROPOSED patch may proceed to APPLIED.
export function proposePatch(patch: Patch): Patch {
  return transitionPatch(patch, isMutationPermitted(patch) ? "APPLIED" : "REJECTED");
}
