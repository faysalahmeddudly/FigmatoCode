import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { findSmallestCommonAncestor, getAncestorChain } from "./ancestors.js";

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

// n0 -> n1 -> n2
//          -> n3
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
      children: ["n2", "n3"],
    }),
    n2: node({ identity: { figmaId: "3", internalId: "n2", structureHash: "h" }, parentId: "n1" }),
    n3: node({ identity: { figmaId: "4", internalId: "n3", structureHash: "h" }, parentId: "n1" }),
  },
};

describe("getAncestorChain", () => {
  it("returns the node itself followed by every ancestor up to the root", () => {
    expect(getAncestorChain("n2", doc)).toEqual(["n2", "n1", "n0"]);
  });

  it("returns just the node for the root", () => {
    expect(getAncestorChain("n0", doc)).toEqual(["n0"]);
  });
});

describe("findSmallestCommonAncestor", () => {
  it("finds the immediate shared parent of two siblings", () => {
    expect(findSmallestCommonAncestor(["n2", "n3"], doc)).toBe("n1");
  });

  it("returns the single node itself when only one is given", () => {
    expect(findSmallestCommonAncestor(["n2"], doc)).toBe("n2");
  });

  it("falls back to the root when nodes only share the root", () => {
    expect(findSmallestCommonAncestor(["n2", "n0"], doc)).toBe("n0");
  });
});
