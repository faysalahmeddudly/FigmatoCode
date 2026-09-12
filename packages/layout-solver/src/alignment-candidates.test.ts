import { describe, expect, it } from "vitest";
import { docOf, evidenceOf, node } from "./test-helpers.js";
import { generateAlignmentCandidates } from "./alignment-candidates.js";

const context = { scoreBefore: 90, parentVersionId: "v0" };

function autoLayoutParent(align?: "START" | "CENTER" | "END" | "STRETCH") {
  return node({
    identity: { figmaId: "1", internalId: "n0", structureHash: "h" },
    children: ["n1"],
    layout: { mode: "AUTO_LAYOUT", axis: "HORIZONTAL", gap: 0, ...(align ? { align } : {}) },
  });
}

function child() {
  return node({
    identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
    parentId: "n0",
  });
}

describe("generateAlignmentCandidates", () => {
  it("proposes every other align value when there's a cross-axis error", () => {
    const doc = docOf(autoLayoutParent("START"), child());
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 0, dy: 6, dw: 0, dh: 0 },
    });

    const candidates = generateAlignmentCandidates(evidence, doc, context);

    expect(candidates.map((c) => c.newValue)).toEqual(["CENTER", "END", "STRETCH"]);
    expect(candidates.every((c) => c.oldValue === "START")).toBe(true);
    expect(candidates.every((c) => c.property === "layout.align")).toBe(true);
    expect(candidates.every((c) => c.targetScope === "PARENT")).toBe(true);
  });

  it("treats an unset align as the current value STRETCH", () => {
    const doc = docOf(autoLayoutParent(), child());
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 0, dy: 6, dw: 0, dh: 0 },
    });
    const candidates = generateAlignmentCandidates(evidence, doc, context);
    expect(candidates.map((c) => c.newValue)).toEqual(["START", "CENTER", "END"]);
  });

  it("ignores a main-axis-only error", () => {
    const doc = docOf(autoLayoutParent("START"), child());
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 6, dy: 0, dw: 0, dh: 0 },
    });
    expect(generateAlignmentCandidates(evidence, doc, context)).toEqual([]);
  });
});
