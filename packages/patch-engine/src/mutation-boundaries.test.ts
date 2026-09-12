import { describe, expect, it } from "vitest";
import type { Patch } from "@figma-engine/shared-contracts";
import { classifyMutation, isMutationPermitted } from "./mutation-boundaries.js";

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

describe("classifyMutation", () => {
  it("classifies gap/padding/width/height as ALLOWED", () => {
    expect(classifyMutation("layout.gap")).toBe("ALLOWED");
    expect(classifyMutation("layout.padding.top")).toBe("ALLOWED");
    expect(classifyMutation("absolute.width")).toBe("ALLOWED");
  });

  it("classifies layout mode changes as CONDITIONAL", () => {
    expect(classifyMutation("layout.mode")).toBe("CONDITIONAL");
  });

  it("classifies clip/mask/stacking changes as RESTRICTED", () => {
    expect(classifyMutation("clip.type")).toBe("RESTRICTED");
  });

  it("classifies structural identity fields as FORBIDDEN", () => {
    expect(classifyMutation("identity.internalId")).toBe("FORBIDDEN");
    expect(classifyMutation("children")).toBe("FORBIDDEN");
  });

  it("defaults an unrecognized property to RESTRICTED, not ALLOWED", () => {
    expect(classifyMutation("someUnknownField")).toBe("RESTRICTED");
  });
});

describe("isMutationPermitted", () => {
  it("permits an ALLOWED mutation with no evidence required", () => {
    expect(isMutationPermitted(patch({ property: "layout.gap", evidence: [] }))).toBe(true);
  });

  it("rejects a FORBIDDEN mutation even with evidence", () => {
    expect(
      isMutationPermitted(patch({ property: "children", evidence: [{ kind: "x", detail: {} }] })),
    ).toBe(false);
  });

  it("rejects a CONDITIONAL mutation with no evidence", () => {
    expect(isMutationPermitted(patch({ property: "layout.mode", evidence: [] }))).toBe(false);
  });

  it("permits a CONDITIONAL mutation backed by evidence", () => {
    expect(
      isMutationPermitted(
        patch({ property: "layout.mode", evidence: [{ kind: "x", detail: {} }] }),
      ),
    ).toBe(true);
  });
});
