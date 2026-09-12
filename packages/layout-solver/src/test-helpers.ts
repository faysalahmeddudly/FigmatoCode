import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import type { RootCauseEvidence } from "@figma-engine/root-cause-engine";

export function node(overrides: Partial<NodeIR> & Pick<NodeIR, "identity">): NodeIR {
  return {
    type: "FRAME",
    name: "n",
    parentId: null,
    children: [],
    absolute: { x: 0, y: 0, width: 100, height: 100 },
    relative: { x: 0, y: 0, width: 100, height: 100 },
    visible: true,
    opacity: 1,
    layout: { mode: "NONE" },
    source: {
      figmaNodeType: "FRAME",
      figmaFileVersion: "v1",
      parserVersion: "0.0.0",
      extractedAt: "2026-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

export function docOf(...nodes: NodeIR[]): DesignDocument {
  const nodes_ = Object.fromEntries(nodes.map((n) => [n.identity.internalId, n]));
  return { rootId: nodes[0]!.identity.internalId, nodes: nodes_ };
}

export function evidenceOf(overrides: Partial<RootCauseEvidence>): RootCauseEvidence {
  return {
    nodeId: "n1",
    ancestorChain: ["n1", "n0"],
    rootCause: "POSITION",
    unresolvedBucket: "UNRESOLVED_LAYOUT",
    regionIds: [],
    regionCoverageArea: 0,
    ...overrides,
  };
}
