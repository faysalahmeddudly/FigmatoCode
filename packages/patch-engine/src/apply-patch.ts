import type { DesignDocument, Patch } from "@figma-engine/shared-contracts";
import { setAtPath } from "./set-path.js";

// PRD §5.2: patch-based, not snapshot-based -- this clones only for immutability of the
// caller's document (structuredClone is a full deep copy either way; the *history* kept by
// callers is forward/reverse patches, not repeated full-project snapshots).
export function applyPatch(doc: DesignDocument, patch: Patch): DesignDocument {
  const node = doc.nodes[patch.targetNodeId];
  if (!node) {
    throw new Error(`Patch target node "${patch.targetNodeId}" not found in document`);
  }

  const cloned = structuredClone(doc);
  const clonedNode = cloned.nodes[patch.targetNodeId]!;
  setAtPath(clonedNode, patch.property.split("."), patch.newValue);
  return cloned;
}
