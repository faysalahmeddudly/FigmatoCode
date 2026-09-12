import { describe, expect, it } from "vitest";
import type { FigmaApiNode } from "@figma-engine/figma-client";
import { mapRadius } from "./map-radius.js";

function node(overrides: Record<string, unknown>): FigmaApiNode {
  return { id: "1:1", name: "n", type: "FRAME", ...overrides };
}

describe("mapRadius", () => {
  it("maps a uniform cornerRadius to all four corners", () => {
    expect(mapRadius(node({ cornerRadius: 12 }))).toEqual({
      topLeft: 12,
      topRight: 12,
      bottomRight: 12,
      bottomLeft: 12,
    });
  });

  it("prefers per-corner radii when present", () => {
    expect(mapRadius(node({ cornerRadius: 12, topLeftRadius: 0 }))).toEqual({
      topLeft: 0,
      topRight: 0,
      bottomRight: 0,
      bottomLeft: 0,
    });
  });

  it("returns undefined when no radius is present", () => {
    expect(mapRadius(node({}))).toBeUndefined();
  });
});
