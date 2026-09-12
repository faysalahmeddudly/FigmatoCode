import { describe, expect, it } from "vitest";
import type { NodeIR } from "@figma-engine/shared-contracts";
import { classifyRootCause } from "./classify.js";

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

const frame = node({ identity: { figmaId: "1", internalId: "n0", structureHash: "h" } });
const text = node({
  identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
  type: "TEXT",
});

describe("classifyRootCause", () => {
  it("returns UNKNOWN when there is no geometry diff at all", () => {
    expect(classifyRootCause(frame, undefined)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN when the geometry diff is within tolerance (likely a pure paint diff)", () => {
    expect(classifyRootCause(frame, { nodeId: "n0", dx: 0.2, dy: 0, dw: 0, dh: 0 })).toBe(
      "UNKNOWN",
    );
  });

  it("classifies a dominant position error as POSITION", () => {
    expect(classifyRootCause(frame, { nodeId: "n0", dx: 10, dy: 2, dw: 0, dh: 0 })).toBe(
      "POSITION",
    );
  });

  it("classifies a dominant size error as SIZE", () => {
    expect(classifyRootCause(frame, { nodeId: "n0", dx: 0, dy: 0, dw: 15, dh: 3 })).toBe("SIZE");
  });

  it("classifies any meaningful geometry deviation on a TEXT node as TYPOGRAPHY", () => {
    expect(classifyRootCause(text, { nodeId: "n1", dx: 0, dy: 0, dw: 5, dh: 0 })).toBe(
      "TYPOGRAPHY",
    );
  });
});
