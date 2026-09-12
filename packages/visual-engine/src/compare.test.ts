import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { compareImages } from "./compare.js";
import { makePngWithRect, makeSolidPng } from "./test-helpers.js";

function node(overrides: Partial<NodeIR> & Pick<NodeIR, "identity">): NodeIR {
  return {
    type: "FRAME",
    name: "n",
    parentId: null,
    children: [],
    absolute: { x: 0, y: 0, width: 20, height: 20 },
    relative: { x: 0, y: 0, width: 20, height: 20 },
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
      children: ["n1"],
    }),
    n1: node({
      identity: { figmaId: "1:2", internalId: "n1", structureHash: "h" },
      parentId: "n0",
      absolute: { x: 5, y: 5, width: 6, height: 6 },
    }),
  },
};

describe("compareImages", () => {
  it("reports a perfect match for identical images", () => {
    const png = makeSolidPng(20, 20, [255, 255, 255, 255]);
    const result = compareImages(png, png, doc);

    expect(result.mismatchedPixels).toBe(0);
    expect(result.perceptualSimilarity).toBe(100);
    expect(result.regions).toEqual([]);
  });

  it("attributes a diff region inside a child node to that child, not the root", () => {
    const reference = makeSolidPng(20, 20, [255, 255, 255, 255]);
    const candidate = makePngWithRect(
      20,
      20,
      [255, 255, 255, 255],
      { x: 6, y: 6, width: 4, height: 4 },
      [0, 0, 0, 255],
    );

    const result = compareImages(reference, candidate, doc);
    expect(result.regions).toHaveLength(1);
    expect(result.regions[0]?.ownerNodeId).toBe("n1");
    expect(result.perceptualSimilarity).toBeLessThan(100);
    expect(result.perceptualSimilarity).toBeGreaterThan(90);
  });
});
