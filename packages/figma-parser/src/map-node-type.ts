import type { NodeType } from "@figma-engine/shared-contracts";
import { UnsupportedNodeError } from "./errors.js";

// PRD §14.5 feature support policy: only node types with a deterministic mapping are
// supported in Phase 1-3; everything else is an explicit UNSUPPORTED_NODE failure.
const FIGMA_TO_NODE_TYPE: Record<string, NodeType> = {
  DOCUMENT: "DOCUMENT",
  CANVAS: "PAGE",
  FRAME: "FRAME",
  GROUP: "GROUP",
  RECTANGLE: "RECTANGLE",
  ELLIPSE: "ELLIPSE",
  TEXT: "TEXT",
  VECTOR: "VECTOR",
  BOOLEAN_OPERATION: "BOOLEAN",
  COMPONENT: "COMPONENT",
  INSTANCE: "INSTANCE",
  SECTION: "SECTION",
};

export function mapNodeType(figmaId: string, figmaType: string): NodeType {
  const mapped = FIGMA_TO_NODE_TYPE[figmaType];
  if (!mapped) {
    throw new UnsupportedNodeError(figmaId, figmaType);
  }
  return mapped;
}
