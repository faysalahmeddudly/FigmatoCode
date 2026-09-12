import { describe, expect, it } from "vitest";
import type { FigmaApiNode } from "@figma-engine/figma-client";
import { mapLayout } from "./map-layout.js";

function node(overrides: Record<string, unknown>): FigmaApiNode {
  return { id: "1:1", name: "n", type: "FRAME", ...overrides };
}

describe("mapLayout", () => {
  it("returns mode NONE when the node has no auto-layout", () => {
    expect(mapLayout(node({}))).toEqual({ mode: "NONE" });
  });

  // Regression: confirmed against a live Figma API response that a node's own
  // layoutSizingHorizontal/Vertical (how it sizes within its PARENT) is present even when
  // that node has no layoutMode of its own (i.e. arranges its own children with mode NONE).
  it("preserves own sizing even when the node itself has mode NONE", () => {
    const result = mapLayout(
      node({ layoutSizingHorizontal: "FIXED", layoutSizingVertical: "HUG" }),
    );

    expect(result).toEqual({
      mode: "NONE",
      sizing: { width: "FIXED", height: "HUG" },
    });
  });

  it("maps AUTO_LAYOUT container fields", () => {
    const result = mapLayout(
      node({
        layoutMode: "HORIZONTAL",
        itemSpacing: 12,
        paddingLeft: 4,
        counterAxisAlignItems: "CENTER",
        primaryAxisAlignItems: "SPACE_BETWEEN",
      }),
    );

    expect(result).toMatchObject({
      mode: "AUTO_LAYOUT",
      axis: "HORIZONTAL",
      gap: 12,
      align: "CENTER",
      justify: "SPACE_BETWEEN",
    });
  });
});
