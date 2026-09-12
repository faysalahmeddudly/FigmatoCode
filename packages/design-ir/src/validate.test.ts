import { describe, expect, it } from "vitest";
import type { NodeIR } from "@figma-engine/shared-contracts";
import { validateDocument } from "./validate.js";
import { DesignDocumentValidationError } from "./errors.js";

function baseNode(overrides: Partial<NodeIR> & Pick<NodeIR, "identity">): NodeIR {
  return {
    type: "FRAME",
    name: "n",
    parentId: null,
    children: [],
    absolute: { x: 0, y: 0, width: 10, height: 10 },
    relative: { x: 0, y: 0, width: 10, height: 10 },
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

describe("validateDocument", () => {
  it("accepts a well-formed document", () => {
    const doc = {
      rootId: "n0",
      nodes: {
        n0: baseNode({
          identity: { figmaId: "1:1", internalId: "n0", structureHash: "h" },
          children: ["n1"],
        }),
        n1: baseNode({
          identity: { figmaId: "1:2", internalId: "n1", structureHash: "h" },
          parentId: "n0",
        }),
      },
    };

    expect(() => validateDocument(doc)).not.toThrow();
  });

  it("rejects a document whose rootId is missing from nodes", () => {
    const doc = { rootId: "missing", nodes: {} };
    expect(() => validateDocument(doc)).toThrow(DesignDocumentValidationError);
  });

  it("rejects a child reference that does not point back to its parent", () => {
    const doc = {
      rootId: "n0",
      nodes: {
        n0: baseNode({
          identity: { figmaId: "1:1", internalId: "n0", structureHash: "h" },
          children: ["n1"],
        }),
        // n1 exists and has a parentId, but it points to itself rather than back to n0,
        // isolating the "child lists parent but parent doesn't list child back" check.
        n1: baseNode({
          identity: { figmaId: "1:2", internalId: "n1", structureHash: "h" },
          parentId: "n1",
        }),
      },
    };

    expect(() => validateDocument(doc)).toThrow(DesignDocumentValidationError);
  });
});
