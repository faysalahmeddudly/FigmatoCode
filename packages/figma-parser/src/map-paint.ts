import type { PaintIR, Rgba } from "@figma-engine/shared-contracts";

interface FigmaPaint {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: { r: number; g: number; b: number; a?: number };
  imageRef?: string;
}

function toRgba(color: { r: number; g: number; b: number; a?: number }, opacity?: number): Rgba {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: (color.a ?? 1) * (opacity ?? 1),
  };
}

// PRD §14.6: only paint types with a deterministic mapping are handled here (SOLID, IMAGE).
// Gradient/other paint types are the layout-solver/paint-engine's domain from Phase 3 onward
// (§14.11.2, §25.0A) and are intentionally not modeled yet rather than approximated.
export function mapPaints(paints: unknown): PaintIR[] {
  if (!Array.isArray(paints)) return [];

  const result: PaintIR[] = [];
  for (const raw of paints as FigmaPaint[]) {
    if (raw.visible === false) continue;
    if (raw.type === "SOLID" && raw.color) {
      result.push({ kind: "SOLID", color: toRgba(raw.color, raw.opacity) });
    } else if (raw.type === "IMAGE" && raw.imageRef) {
      result.push({ kind: "IMAGE", assetId: raw.imageRef });
    }
  }
  return result;
}
