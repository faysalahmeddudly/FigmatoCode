import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR } from "@figma-engine/shared-contracts";
import type { RootCauseEvidence } from "@figma-engine/root-cause-engine";
import { proposeGapAdjustment } from "./gap-candidate-rule.js";

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
      layout: { mode: "AUTO_LAYOUT", axis: "VERTICAL", gap: 16 },
      children: ["n1"],
    }),
    n1: node({ identity: { figmaId: "2", internalId: "n1", structureHash: "h" }, parentId: "n0" }),
  },
};

function evidence(overrides: Partial<RootCauseEvidence>): RootCauseEvidence {
  return {
    nodeId: "n1",
    ancestorChain: ["n1", "n0"],
    rootCause: "POSITION",
    unresolvedBucket: "UNRESOLVED_LAYOUT",
    geometryDiff: { nodeId: "n1", dx: 0, dy: -8, dw: 0, dh: 0 },
    regionIds: [],
    regionCoverageArea: 0,
    ...overrides,
  };
}

describe("proposeGapAdjustment", () => {
  it("proposes reducing gap when the child renders too far along the main axis", () => {
    // dy = +8 means candidate is 8px further down than reference -> gap should shrink by 8.
    const patch = proposeGapAdjustment(
      evidence({ geometryDiff: { nodeId: "n1", dx: 0, dy: 8, dw: 0, dh: 0 } }),
      doc,
      { scoreBefore: 90, parentVersionId: "v0" },
    );

    expect(patch).toMatchObject({
      targetNodeId: "n0",
      property: "layout.gap",
      oldValue: 16,
      newValue: 8,
    });
  });

  it("returns undefined for a non-POSITION root cause", () => {
    expect(
      proposeGapAdjustment(evidence({ rootCause: "SIZE" }), doc, {
        scoreBefore: 90,
        parentVersionId: "v0",
      }),
    ).toBeUndefined();
  });

  it("returns undefined when the parent isn't an AUTO_LAYOUT container", () => {
    const noAutoLayoutDoc: DesignDocument = {
      rootId: "n0",
      nodes: {
        n0: node({
          identity: { figmaId: "1", internalId: "n0", structureHash: "h" },
          children: ["n1"],
        }),
        n1: node({
          identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
          parentId: "n0",
        }),
      },
    };
    expect(
      proposeGapAdjustment(evidence({}), noAutoLayoutDoc, {
        scoreBefore: 90,
        parentVersionId: "v0",
      }),
    ).toBeUndefined();
  });

  it("returns undefined when the offset is negligible", () => {
    expect(
      proposeGapAdjustment(
        evidence({ geometryDiff: { nodeId: "n1", dx: 0, dy: 0.1, dw: 0, dh: 0 } }),
        doc,
        { scoreBefore: 90, parentVersionId: "v0" },
      ),
    ).toBeUndefined();
  });

  it("never proposes a negative gap", () => {
    const patch = proposeGapAdjustment(
      evidence({ geometryDiff: { nodeId: "n1", dx: 0, dy: 100, dw: 0, dh: 0 } }),
      doc,
      { scoreBefore: 90, parentVersionId: "v0" },
    );
    expect(patch?.newValue).toBe(0);
  });
});
