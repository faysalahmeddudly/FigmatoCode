import type { RadiusIR } from "@figma-engine/shared-contracts";
import type { FigmaApiNode } from "@figma-engine/figma-client";

interface RadiusFields {
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
}

// PRD §14.6: "Per-corner values when source provides them" -- confirmed against a live
// response that Figma reports a uniform `cornerRadius` when corners match, and per-corner
// `*Radius` fields only when they differ.
export function mapRadius(rawNode: FigmaApiNode): RadiusIR | undefined {
  const node = rawNode as FigmaApiNode & RadiusFields;
  const hasPerCorner =
    node.topLeftRadius !== undefined ||
    node.topRightRadius !== undefined ||
    node.bottomLeftRadius !== undefined ||
    node.bottomRightRadius !== undefined;

  if (hasPerCorner) {
    return {
      topLeft: node.topLeftRadius ?? 0,
      topRight: node.topRightRadius ?? 0,
      bottomRight: node.bottomRightRadius ?? 0,
      bottomLeft: node.bottomLeftRadius ?? 0,
    };
  }

  if (node.cornerRadius !== undefined) {
    return {
      topLeft: node.cornerRadius,
      topRight: node.cornerRadius,
      bottomRight: node.cornerRadius,
      bottomLeft: node.cornerRadius,
    };
  }

  return undefined;
}
