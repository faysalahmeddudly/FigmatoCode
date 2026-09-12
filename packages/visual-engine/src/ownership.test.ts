import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { findOwningNodeId } from "./ownership.js";
import type { DiffRegion } from "./regions.js";

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
      identity: { figmaId: "1:1", internalId: "n0", structureHash: "h" },
      absolute: { x: 1000, y: 1000, width: 400, height: 200 },
      children: ["n1"],
    }),
    n1: node({
      identity: { figmaId: "1:2", internalId: "n1", structureHash: "h" },
      parentId: "n0",
      absolute: { x: 1020, y: 1020, width: 50, height: 50 },
    }),
  },
};

function region(x: number, y: number, width: number, height: number): DiffRegion {
  return { id: 0, boundingBox: { x, y, width, height }, area: width * height, severity: "LOW" };
}

describe("findOwningNodeId", () => {
  it("picks the smallest node containing the region center", () => {
    // Region at frame-local (20,20) 4x4 falls inside both n0 (0,0,400,200) and n1 (20,20,50,50).
    const owner = findOwningNodeId(region(20, 20, 4, 4), doc);
    expect(owner).toBe("n1");
  });

  it("falls back to the larger ancestor when only it contains the region", () => {
    const owner = findOwningNodeId(region(200, 100, 4, 4), doc);
    expect(owner).toBe("n0");
  });

  it("returns undefined when no node contains the region", () => {
    const owner = findOwningNodeId(region(9000, 9000, 4, 4), doc);
    expect(owner).toBeUndefined();
  });
});
