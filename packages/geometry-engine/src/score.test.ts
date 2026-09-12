import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { computeGeometryDiffs } from "./diff.js";
import { computeGeometryScore } from "./score.js";

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
      absolute: { x: 0, y: 0, width: 400, height: 200 },
      relative: { x: 0, y: 0, width: 400, height: 200 },
    }),
  },
};

describe("computeGeometryScore", () => {
  it("scores an exact match as 100", () => {
    const { diffs } = computeGeometryDiffs(doc, { n0: { x: 0, y: 0, width: 400, height: 200 } });
    expect(computeGeometryScore(diffs, doc)).toBe(100);
  });

  it("scores a large positional error close to 0", () => {
    const { diffs } = computeGeometryDiffs(doc, {
      n0: { x: 1000, y: 1000, width: 400, height: 200 },
    });
    expect(computeGeometryScore(diffs, doc)).toBeLessThan(5);
  });

  it("penalizes a small error only slightly", () => {
    const { diffs } = computeGeometryDiffs(doc, { n0: { x: 2, y: 0, width: 400, height: 200 } });
    const score = computeGeometryScore(diffs, doc);
    expect(score).toBeGreaterThan(95);
    expect(score).toBeLessThan(100);
  });
});
