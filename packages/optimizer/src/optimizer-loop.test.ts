import { describe, expect, it } from "vitest";
import type { DesignDocument, NodeIR, Patch } from "@figma-engine/shared-contracts";
import { attemptPatch } from "./optimizer-loop.js";

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

function patch(overrides: Partial<Patch>): Patch {
  return {
    id: "p1",
    targetNodeId: "n0",
    targetScope: "NODE",
    property: "layout.gap",
    oldValue: 16,
    newValue: 8,
    reason: "test",
    evidence: [],
    scoreBefore: 90,
    parentVersionId: "v0",
    status: "PROPOSED",
    ...overrides,
  };
}

describe("attemptPatch", () => {
  it("commits an accepted improvement and applies it to the returned document", async () => {
    const outcome = await attemptPatch(doc, patch({}), async () => ({
      fidelityScore: 96,
      hasCriticalRegression: false,
      renderReady: true,
    }));

    expect(outcome.finalPatch.status).toBe("COMMITTED");
    expect(outcome.record.accepted).toBe(true);
    expect(outcome.resultingDoc.nodes.n0?.layout.gap).toBe(8);
  });

  it("rolls back and keeps the original document when the score doesn't improve enough", async () => {
    const outcome = await attemptPatch(doc, patch({}), async () => ({
      fidelityScore: 90.01,
      hasCriticalRegression: false,
      renderReady: true,
    }));

    expect(outcome.finalPatch.status).toBe("ROLLED_BACK");
    expect(outcome.record.accepted).toBe(false);
    expect(outcome.resultingDoc.nodes.n0?.layout.gap).toBe(16);
  });

  it("rejects a patch that fails the mutation-boundary gate before ever evaluating it", async () => {
    let evaluated = false;
    const outcome = await attemptPatch(doc, patch({ property: "children" }), async () => {
      evaluated = true;
      return { fidelityScore: 100, hasCriticalRegression: false, renderReady: true };
    });

    expect(outcome.finalPatch.status).toBe("REJECTED");
    expect(evaluated).toBe(false);
    expect(outcome.resultingDoc).toBe(doc);
  });

  it("treats a throwing evaluator as a critical regression and rolls back", async () => {
    const outcome = await attemptPatch(doc, patch({}), async () => {
      throw new Error("render crashed");
    });

    expect(outcome.finalPatch.status).toBe("ROLLED_BACK");
    expect(outcome.record.accepted).toBe(false);
  });
});
