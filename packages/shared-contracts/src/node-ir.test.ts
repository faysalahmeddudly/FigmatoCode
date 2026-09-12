import { describe, expect, it } from "vitest";
import { NodeIRSchema } from "./node-ir.js";

describe("NodeIRSchema", () => {
  it("accepts a minimal valid FRAME node", () => {
    const node = {
      identity: { figmaId: "1:1", internalId: "n1", structureHash: "abc" },
      type: "FRAME",
      name: "Root",
      parentId: null,
      children: [],
      absolute: { x: 0, y: 0, width: 100, height: 100 },
      relative: { x: 0, y: 0, width: 100, height: 100 },
      visible: true,
      opacity: 1,
      layout: { mode: "NONE" },
      source: {
        figmaNodeType: "FRAME",
        figmaFileVersion: "v1",
        parserVersion: "0.0.0",
        extractedAt: "2026-01-01T00:00:00.000Z",
      },
    };

    expect(NodeIRSchema.safeParse(node).success).toBe(true);
  });

  it("rejects opacity outside [0,1]", () => {
    const node = {
      identity: { figmaId: "1:1", internalId: "n1", structureHash: "abc" },
      type: "FRAME",
      name: "Root",
      parentId: null,
      children: [],
      absolute: { x: 0, y: 0, width: 100, height: 100 },
      relative: { x: 0, y: 0, width: 100, height: 100 },
      visible: true,
      opacity: 1.5,
      layout: { mode: "NONE" },
      source: {
        figmaNodeType: "FRAME",
        figmaFileVersion: "v1",
        parserVersion: "0.0.0",
        extractedAt: "2026-01-01T00:00:00.000Z",
      },
    };

    expect(NodeIRSchema.safeParse(node).success).toBe(false);
  });
});
