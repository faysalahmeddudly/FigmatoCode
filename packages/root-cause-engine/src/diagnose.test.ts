import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { diagnose } from "./diagnose.js";

function node(overrides: Partial<NodeIR> & Pick<NodeIR, "identity">): NodeIR {
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

const doc: DesignDocument = {
  rootId: "n0",
  nodes: {
    n0: node({
      identity: { figmaId: "1", internalId: "n0", structureHash: "h" },
      children: ["n1"],
    }),
    n1: node({
      identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
      parentId: "n0",
      type: "TEXT",
    }),
  },
};

describe("diagnose", () => {
  it("emits evidence for a node with a geometry diff, routed through §16.1A", () => {
    const evidence = diagnose(doc, [{ nodeId: "n1", dx: 0, dy: 0, dw: 8, dh: 0 }], []);

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      nodeId: "n1",
      ancestorChain: ["n1", "n0"],
      rootCause: "TYPOGRAPHY",
      unresolvedBucket: "UNRESOLVED_TYPOGRAPHY",
    });
  });

  it("emits evidence for a node known only through an owned diff region, with no geometry diff", () => {
    const evidence = diagnose(doc, [], [{ id: 0, area: 50, ownerNodeId: "n0" }]);

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      nodeId: "n0",
      rootCause: "UNKNOWN",
      unresolvedBucket: "UNRESOLVED_SOURCE_AMBIGUITY",
      regionIds: [0],
      regionCoverageArea: 50,
    });
  });

  it("ignores diff regions with no owning node rather than crashing", () => {
    const evidence = diagnose(doc, [], [{ id: 0, area: 50 }]);
    expect(evidence).toHaveLength(0);
  });

  it("merges geometry and region evidence for the same node", () => {
    const evidence = diagnose(
      doc,
      [{ nodeId: "n0", dx: 5, dy: 5, dw: 0, dh: 0 }],
      [{ id: 0, area: 20, ownerNodeId: "n0" }],
    );

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      nodeId: "n0",
      rootCause: "POSITION",
      regionIds: [0],
      regionCoverageArea: 20,
    });
  });
});
