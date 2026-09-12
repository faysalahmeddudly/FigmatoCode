import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR, Patch } from "@figma-engine/shared-contracts";
import { beamSearch } from "./beam-search.js";

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
    layout: { mode: "AUTO_LAYOUT", axis: "VERTICAL", gap: 16 },
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

function gapPatch(id: string, newValue: number): Patch {
  return {
    id,
    targetNodeId: "n0",
    targetScope: "NODE",
    property: "layout.gap",
    oldValue: 16,
    newValue,
    reason: "test",
    evidence: [],
    scoreBefore: 90,
    parentVersionId: "v0",
    status: "PROPOSED",
  };
}

describe("beamSearch", () => {
  it("walks toward the candidate with the best score and stops once nothing beats it", async () => {
    // Three single-step hypotheses; gap=8 scores best. Once gap=8 is applied, the next
    // generation round (evaluated against a doc whose gap is already 8) finds nothing better
    // and the search terminates without regressing.
    const result = await beamSearch(
      doc,
      90,
      (candidateDoc) => {
        if (candidateDoc.nodes.n0?.layout.gap === 8) return [];
        return [gapPatch("gap-8", 8), gapPatch("gap-4", 4), gapPatch("gap-12", 12)];
      },
      async (candidateDoc) => {
        const gap = candidateDoc.nodes.n0?.layout.gap;
        const fidelityScore = gap === 8 ? 99 : gap === 4 ? 93 : gap === 12 ? 96 : 90;
        return { fidelityScore, hasCriticalRegression: false, renderReady: true };
      },
    );

    expect(result.best.score).toBe(99);
    expect(result.best.doc.nodes.n0?.layout.gap).toBe(8);
    expect(result.best.patches.map((p) => p.id)).toEqual(["gap-8"]);
  });

  it("never regresses below the initial score when no candidate ever clears the acceptance threshold", async () => {
    const result = await beamSearch(
      doc,
      90,
      () => [gapPatch("gap-tiny-improvement", 15)],
      async () => ({ fidelityScore: 90.02, hasCriticalRegression: false, renderReady: true }),
    );

    expect(result.best.score).toBe(90);
    expect(result.best.doc).toBe(doc);
    expect(result.best.patches).toEqual([]);
  });

  it("respects beamWidth and maxIterations", async () => {
    let calls = 0;
    const result = await beamSearch(
      doc,
      90,
      (candidateDoc) => {
        const gap = candidateDoc.nodes.n0?.layout.gap ?? 16;
        calls++;
        return [gapPatch(`gap-${calls}`, gap - 1)];
      },
      async (candidateDoc) => ({
        fidelityScore: 90 + (16 - (candidateDoc.nodes.n0?.layout.gap ?? 16)),
        hasCriticalRegression: false,
        renderReady: true,
      }),
      { maxIterations: 3, beamWidth: 1 },
    );

    expect(result.iterationsRun).toBe(3);
    expect(result.best.patches).toHaveLength(3);
  });
});
