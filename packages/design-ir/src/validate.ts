import { DesignDocumentSchema, type DesignDocument } from "@figma-engine/shared-contracts";
import { DesignDocumentValidationError } from "./errors.js";

// design-ir owns canonical schema validation only (PRD §25); it must not contain optimizer
// heuristics or extraction logic. Beyond per-node schema shape (delegated to
// DesignDocumentSchema), this checks the referential integrity a schema alone can't express:
// every child/parent id actually resolves, and the root is the only parentless node.
export function validateDocument(input: unknown): DesignDocument {
  const parsed = DesignDocumentSchema.parse(input);
  const issues: string[] = [];

  if (!parsed.nodes[parsed.rootId]) {
    issues.push(`rootId "${parsed.rootId}" is not present in nodes`);
  }

  for (const [id, node] of Object.entries(parsed.nodes)) {
    if (id !== node.identity.internalId) {
      issues.push(`node keyed "${id}" has identity.internalId "${node.identity.internalId}"`);
    }
    if (node.parentId !== null && !parsed.nodes[node.parentId]) {
      issues.push(`node "${id}" has parentId "${node.parentId}" which does not exist`);
    }
    if (id !== parsed.rootId && node.parentId === null) {
      issues.push(`node "${id}" has no parent but is not the document root`);
    }
    for (const childId of node.children) {
      if (!parsed.nodes[childId]) {
        issues.push(`node "${id}" references missing child "${childId}"`);
      } else if (parsed.nodes[childId]?.parentId !== id) {
        issues.push(`node "${id}" lists child "${childId}" whose parentId does not point back`);
      }
    }
  }

  if (issues.length > 0) {
    throw new DesignDocumentValidationError(issues);
  }

  return parsed;
}
