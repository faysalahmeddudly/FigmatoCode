// PRD §21.1: unsupported source features are explicit typed failures, never silently dropped (§32.2).
export class UnsupportedNodeError extends Error {
  readonly code = "UNSUPPORTED_NODE" as const;
  readonly figmaNodeId: string;
  readonly figmaNodeType: string;

  constructor(figmaNodeId: string, figmaNodeType: string) {
    super(`Unsupported Figma node type "${figmaNodeType}" (node ${figmaNodeId})`);
    this.name = "UnsupportedNodeError";
    this.figmaNodeId = figmaNodeId;
    this.figmaNodeType = figmaNodeType;
  }
}
