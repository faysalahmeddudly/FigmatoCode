import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import { applyPatch } from "./apply-patch.js";

// PRD §5.2 "forward patch, reverse patch": the reverse patch swaps old/new values so
// rollback is just another applyPatch call, not a separate mutation code path.
export function reversePatch(patch: Patch): Patch {
  return {
    ...patch,
    id: `${patch.id}:reverse`,
    oldValue: patch.newValue,
    newValue: patch.oldValue,
    scoreBefore: patch.scoreAfter ?? patch.scoreBefore,
    scoreAfter: patch.scoreBefore,
    status: "PROPOSED",
  };
}

// PRD §16.3: EVALUATED -> ROLLED_BACK, or APPLIED -> ROLLED_BACK on runtime/render failure.
// Rolling back re-applies the inverse mutation; it does not restore a saved snapshot.
export function rollbackPatch(doc: DesignDocument, patch: Patch): DesignDocument {
  return applyPatch(doc, reversePatch(patch));
}
