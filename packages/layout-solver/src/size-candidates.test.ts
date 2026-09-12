import { describe, expect, it } from "vitest";
import { docOf, evidenceOf, node } from "./test-helpers.js";
import { generateWidthCandidates, generateHeightCandidates } from "./size-candidates.js";

const context = { scoreBefore: 90, parentVersionId: "v0" };

function fixedNode() {
  return node({
    identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
    parentId: "n0",
    absolute: { x: 0, y: 0, width: 100, height: 40 },
    layout: { mode: "NONE", sizing: { width: "FIXED", height: "FIXED" } },
  });
}

describe("generateWidthCandidates", () => {
  it("proposes the exact correction plus bounded neighbors, ordered exact/-1/+1", () => {
    const doc = docOf(
      node({ identity: { figmaId: "1", internalId: "n0", structureHash: "h" }, children: ["n1"] }),
      fixedNode(),
    );
    const evidence = evidenceOf({
      rootCause: "SIZE",
      geometryDiff: { nodeId: "n1", dx: 0, dy: 0, dw: 8, dh: 0 },
    });

    const candidates = generateWidthCandidates(evidence, doc, context);

    expect(candidates.map((c) => c.newValue)).toEqual([92, 91, 93]);
    expect(candidates.every((c) => c.property === "absolute.width")).toBe(true);
    expect(candidates.every((c) => c.targetNodeId === "n1")).toBe(true);
  });

  it("returns nothing below the measurement-noise floor", () => {
    const doc = docOf(fixedNode());
    const evidence = evidenceOf({
      rootCause: "SIZE",
      geometryDiff: { nodeId: "n1", dx: 0, dy: 0, dw: 0.1, dh: 0 },
    });
    expect(generateWidthCandidates(evidence, doc, context)).toEqual([]);
  });

  it("skips non-FIXED sizing, since there's no settable measured value", () => {
    const doc = docOf(
      node({
        identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
        layout: { mode: "NONE", sizing: { width: "FILL", height: "FIXED" } },
      }),
    );
    const evidence = evidenceOf({
      rootCause: "SIZE",
      geometryDiff: { nodeId: "n1", dx: 0, dy: 0, dw: 8, dh: 0 },
    });
    expect(generateWidthCandidates(evidence, doc, context)).toEqual([]);
  });

  it("only applies to a SIZE root cause", () => {
    const doc = docOf(fixedNode());
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 0, dy: 0, dw: 8, dh: 0 },
    });
    expect(generateWidthCandidates(evidence, doc, context)).toEqual([]);
  });
});

describe("generateHeightCandidates", () => {
  it("proposes candidates against absolute.height using dh", () => {
    const doc = docOf(fixedNode());
    const evidence = evidenceOf({
      rootCause: "SIZE",
      geometryDiff: { nodeId: "n1", dx: 0, dy: 0, dw: 0, dh: -4 },
    });

    const candidates = generateHeightCandidates(evidence, doc, context);

    expect(candidates.map((c) => c.newValue)).toEqual([44, 43, 45]);
    expect(candidates.every((c) => c.property === "absolute.height")).toBe(true);
  });
});
