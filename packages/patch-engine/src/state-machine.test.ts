import { describe, expect, it } from "vitest";
import type { Patch } from "@figma-engine/shared-contracts";
import { InvalidPatchTransitionError, proposePatch, transitionPatch } from "./state-machine.js";

function patch(overrides: Partial<Patch>): Patch {
  return {
    id: "p1",
    targetNodeId: "n1",
    targetScope: "NODE",
    property: "layout.gap",
    oldValue: 8,
    newValue: 16,
    reason: "test",
    evidence: [],
    scoreBefore: 90,
    parentVersionId: "v0",
    status: "PROPOSED",
    ...overrides,
  };
}

describe("transitionPatch", () => {
  it("allows a valid transition", () => {
    expect(transitionPatch(patch({ status: "PROPOSED" }), "APPLIED").status).toBe("APPLIED");
  });

  it("rejects an invalid transition", () => {
    expect(() => transitionPatch(patch({ status: "COMMITTED" }), "APPLIED")).toThrow(
      InvalidPatchTransitionError,
    );
  });

  it("rejects transitioning out of a terminal state", () => {
    expect(() => transitionPatch(patch({ status: "ROLLED_BACK" }), "COMMITTED")).toThrow();
  });
});

describe("proposePatch", () => {
  it("moves an ALLOWED-mutation patch to APPLIED", () => {
    expect(proposePatch(patch({ property: "layout.gap" })).status).toBe("APPLIED");
  });

  it("moves a FORBIDDEN-mutation patch to REJECTED", () => {
    expect(proposePatch(patch({ property: "children" })).status).toBe("REJECTED");
  });

  it("moves an unevidenced CONDITIONAL-mutation patch to REJECTED", () => {
    expect(proposePatch(patch({ property: "layout.mode", evidence: [] })).status).toBe("REJECTED");
  });
});
