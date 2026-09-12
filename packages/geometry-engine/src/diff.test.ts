import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import { computeGeometryDiffs } from "./diff.js";

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

// Reference: root at Figma-canvas position (5000, 300), a child 16px inset from it.
const doc: DesignDocument = {
  rootId: "n0",
  nodes: {
    n0: node({
      identity: { figmaId: "1:1", internalId: "n0", structureHash: "h" },
      absolute: { x: 5000, y: 300, width: 400, height: 200 },
      relative: { x: 5000, y: 300, width: 400, height: 200 },
      children: ["n1"],
    }),
    n1: node({
      identity: { figmaId: "1:2", internalId: "n1", structureHash: "h" },
      parentId: "n0",
      absolute: { x: 5016, y: 316, width: 100, height: 50 },
      relative: { x: 16, y: 16, width: 100, height: 50 },
    }),
  },
};

describe("computeGeometryDiffs", () => {
  it("reports zero diff when DOM metrics exactly match reference geometry", () => {
    const domMetrics = {
      n0: { x: 0, y: 0, width: 400, height: 200 },
      n1: { x: 16, y: 16, width: 100, height: 50 },
    };

    const { diffs, missingNodeIds } = computeGeometryDiffs(doc, domMetrics);
    expect(missingNodeIds).toEqual([]);
    for (const diff of diffs) {
      expect(diff.dx).toBe(0);
      expect(diff.dy).toBe(0);
      expect(diff.dw).toBe(0);
      expect(diff.dh).toBe(0);
      expect(diff.dxRel).toBe(0);
      expect(diff.dyRel).toBe(0);
    }
  });

  it("translates the reference's Figma-canvas absolute coordinates into frame-local space", () => {
    // Root itself: frame-local reference absolute is (0,0), so a DOM rect at (0,0) is exact.
    const domMetrics = {
      n0: { x: 0, y: 0, width: 400, height: 200 },
      n1: { x: 20, y: 20, width: 100, height: 50 },
    };

    const { diffs } = computeGeometryDiffs(doc, domMetrics);
    const n1Diff = diffs.find((d) => d.nodeId === "n1")!;

    // Candidate absolute (20,20) vs reference frame-local absolute (16,16) -> dx=dy=4.
    expect(n1Diff.dx).toBe(4);
    expect(n1Diff.dy).toBe(4);
    // Candidate relative-to-parent (20,20) vs reference relative (16,16) -> dxRel=dyRel=4.
    expect(n1Diff.dxRel).toBe(4);
    expect(n1Diff.dyRel).toBe(4);
  });

  it("lists nodes absent from domMetrics as missing rather than silently skipping them", () => {
    const { diffs, missingNodeIds } = computeGeometryDiffs(doc, {
      n0: { x: 0, y: 0, width: 400, height: 200 },
    });

    expect(missingNodeIds).toEqual(["n1"]);
    expect(diffs).toHaveLength(1);
  });
});
