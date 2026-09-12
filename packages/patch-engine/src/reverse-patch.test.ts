import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR, Patch } from "@figma-engine/shared-contracts";
import { applyPatch } from "./apply-patch.js";
import { reversePatch, rollbackPatch } from "./reverse-patch.js";

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
    layout: { mode: "AUTO_LAYOUT", axis: "VERTICAL", gap: 8 },
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
  nodes: { n0: node({ identity: { figmaId: "1", internalId: "n0", structureHash: "h" } }) },
};

function patch(overrides: Partial<Patch>): Patch {
  return {
    id: "p1",
    targetNodeId: "n0",
    targetScope: "NODE",
    property: "layout.gap",
    oldValue: 8,
    newValue: 16,
    reason: "test",
    evidence: [],
    scoreBefore: 90,
    scoreAfter: 92,
    parentVersionId: "v0",
    status: "EVALUATED",
    ...overrides,
  };
}

describe("reversePatch", () => {
  it("swaps old/new values and scores", () => {
    const reversed = reversePatch(patch({}));
    expect(reversed.oldValue).toBe(16);
    expect(reversed.newValue).toBe(8);
    expect(reversed.scoreBefore).toBe(92);
    expect(reversed.scoreAfter).toBe(90);
    expect(reversed.status).toBe("PROPOSED");
  });
});

describe("rollbackPatch", () => {
  it("restores the pre-patch value by re-applying the inverse", () => {
    const applied = applyPatch(doc, patch({}));
    expect(applied.nodes.n0?.layout.gap).toBe(16);

    const rolledBack = rollbackPatch(applied, patch({}));
    expect(rolledBack.nodes.n0?.layout.gap).toBe(8);
  });
});
