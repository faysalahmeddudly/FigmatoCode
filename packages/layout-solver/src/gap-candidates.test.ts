import { describe, expect, it } from "vitest";
import { docOf, evidenceOf, node } from "./test-helpers.js";
import { generateGapCandidates } from "./gap-candidates.js";

const context = { scoreBefore: 90, parentVersionId: "v0" };

function autoLayoutParent() {
  return node({
    identity: { figmaId: "1", internalId: "n0", structureHash: "h" },
    children: ["n1"],
    layout: { mode: "AUTO_LAYOUT", axis: "HORIZONTAL", gap: 16 },
  });
}

function child() {
  return node({
    identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
    parentId: "n0",
  });
}

describe("generateGapCandidates", () => {
  it("proposes exact-correction plus bounded neighbors along the parent's main axis", () => {
    const doc = docOf(autoLayoutParent(), child());
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 8, dy: 0, dw: 0, dh: 0 },
    });

    const candidates = generateGapCandidates(evidence, doc, context);

    expect(candidates.map((c) => c.newValue)).toEqual([8, 7, 9]);
    expect(candidates.every((c) => c.targetNodeId === "n0")).toBe(true);
    expect(candidates.every((c) => c.targetScope === "PARENT")).toBe(true);
    expect(candidates.every((c) => c.property === "layout.gap")).toBe(true);
  });

  it("never proposes a negative gap", () => {
    const doc = docOf(autoLayoutParent(), child());
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 30, dy: 0, dw: 0, dh: 0 },
    });
    const candidates = generateGapCandidates(evidence, doc, context);
    expect(candidates.every((c) => (c.newValue as number) >= 0)).toBe(true);
  });

  it("does nothing when the parent isn't an auto-layout container", () => {
    const doc = docOf(
      node({ identity: { figmaId: "1", internalId: "n0", structureHash: "h" }, children: ["n1"] }),
      child(),
    );
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 8, dy: 0, dw: 0, dh: 0 },
    });
    expect(generateGapCandidates(evidence, doc, context)).toEqual([]);
  });
});
