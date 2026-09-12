import type { LayoutIR, NodeIR } from "@figma-engine/shared-contracts";

type LayoutAxis = NonNullable<LayoutIR["axis"]>;

export interface SizingDeclarations {
  width?: string;
  height?: string;
  flexGrow?: string;
  flexShrink?: string;
  flexBasis?: string;
  alignSelf?: string;
  minWidth?: string;
  minHeight?: string;
}

// PRD §14.6 "Fill container -> flex:1 / width:100% depending on axis": FILL on the axis that
// matches the parent's main axis becomes flex-grow; FILL on the cross axis becomes
// align-self:stretch. FIXED always becomes an explicit px dimension from measured geometry
// (§14.6 "Fixed size -> fixed px dimensions"). HUG is left to natural content sizing.
export function computeChildSizing(node: NodeIR, parentAxis: LayoutAxis): SizingDeclarations {
  const sizing = node.layout.sizing;
  if (!sizing) return {};

  const decl: SizingDeclarations = {};
  const dimensions: Array<{ dimension: "width" | "height"; mode: string }> = [
    { dimension: "width", mode: sizing.width },
    { dimension: "height", mode: sizing.height },
  ];

  for (const { dimension, mode } of dimensions) {
    const isMainAxis =
      (parentAxis === "HORIZONTAL" && dimension === "width") ||
      (parentAxis === "VERTICAL" && dimension === "height");

    if (mode === "FIXED") {
      decl[dimension] = `${node.absolute[dimension]}px`;
    } else if (mode === "FILL") {
      if (isMainAxis) {
        decl.flexGrow = "1";
        decl.flexShrink = "1";
        decl.flexBasis = "0";
        if (dimension === "width") decl.minWidth = "0";
        else decl.minHeight = "0";
      } else {
        decl.alignSelf = "stretch";
      }
    }
    // HUG: leave unset, natural content sizing.
  }

  return decl;
}

// PRD §14.6 "Absolute child -> position:absolute": when the parent has no auto-layout, each
// child keeps its measured geometry directly rather than participating in flex sizing.
export function computeAbsoluteChildSizing(node: NodeIR): SizingDeclarations {
  return {
    width: `${node.absolute.width}px`,
    height: `${node.absolute.height}px`,
  };
}
