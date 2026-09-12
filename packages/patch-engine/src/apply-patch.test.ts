import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR, Patch } from "@figma-engine/shared-contracts";
import { applyPatch } from "./apply-patch.js";

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
    layout: {
      mode: "AUTO_LAYOUT",
      axis: "VERTICAL",
      gap: 8,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    },
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
    parentVersionId: "v0",
    status: "APPLIED",
    ...overrides,
  };
}

describe("applyPatch", () => {
  it("mutates the target property on a new document, leaving the original untouched", () => {
    const result = applyPatch(doc, patch({}));

    expect(result.nodes.n0?.layout.gap).toBe(16);
    expect(doc.nodes.n0?.layout.gap).toBe(8);
  });

  it("throws when the target node does not exist", () => {
    expect(() => applyPatch(doc, patch({ targetNodeId: "missing" }))).toThrow();
  });

  it("sets a nested property path such as layout.padding.top", () => {
    const result = applyPatch(
      doc,
      patch({ property: "layout.padding.top", oldValue: 0, newValue: 24 }),
    );
    expect(result.nodes.n0?.layout.padding?.top).toBe(24);
  });
});
