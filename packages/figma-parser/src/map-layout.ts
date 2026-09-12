import type { LayoutIR } from "@figma-engine/shared-contracts";
import type { FigmaApiNode } from "@figma-engine/figma-client";

interface AutoLayoutFields {
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  layoutWrap?: "NO_WRAP" | "WRAP";
  layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
  layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

const ALIGN_MAP: Record<string, LayoutIR["align"]> = {
  MIN: "START",
  CENTER: "CENTER",
  MAX: "END",
  BASELINE: "START",
};

const JUSTIFY_MAP: Record<string, LayoutIR["justify"]> = {
  MIN: "START",
  CENTER: "CENTER",
  MAX: "END",
  SPACE_BETWEEN: "SPACE_BETWEEN",
};

// PRD §14.6: Horizontal/Vertical Auto Layout -> flex row/column, gap -> gap, padding -> padding.
export function mapLayout(node: FigmaApiNode): LayoutIR {
  const fields = node as FigmaApiNode & AutoLayoutFields;

  if (!fields.layoutMode || fields.layoutMode === "NONE") {
    return { mode: "NONE" };
  }

  const layout: LayoutIR = {
    mode: "AUTO_LAYOUT",
    axis: fields.layoutMode === "HORIZONTAL" ? "HORIZONTAL" : "VERTICAL",
    gap: fields.itemSpacing ?? 0,
    padding: {
      top: fields.paddingTop ?? 0,
      right: fields.paddingRight ?? 0,
      bottom: fields.paddingBottom ?? 0,
      left: fields.paddingLeft ?? 0,
    },
    wrap: fields.layoutWrap === "WRAP",
  };

  if (fields.counterAxisAlignItems) {
    layout.align = ALIGN_MAP[fields.counterAxisAlignItems];
  }
  if (fields.primaryAxisAlignItems) {
    layout.justify = JUSTIFY_MAP[fields.primaryAxisAlignItems];
  }
  if (fields.layoutSizingHorizontal || fields.layoutSizingVertical) {
    layout.sizing = {
      width: fields.layoutSizingHorizontal ?? "FIXED",
      height: fields.layoutSizingVertical ?? "FIXED",
    };
  }
  if (fields.minWidth !== undefined) layout.minWidth = fields.minWidth;
  if (fields.maxWidth !== undefined) layout.maxWidth = fields.maxWidth;
  if (fields.minHeight !== undefined) layout.minHeight = fields.minHeight;
  if (fields.maxHeight !== undefined) layout.maxHeight = fields.maxHeight;

  return layout;
}
