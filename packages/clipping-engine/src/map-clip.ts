import type { ClipIR } from "@figma-engine/shared-contracts";
import type { MappingResult } from "./types.js";

interface InsetGeometry {
  top: number;
  right: number;
  bottom: number;
  left: number;
  radius?: number;
}

function isInsetGeometry(value: unknown): value is InsetGeometry {
  if (typeof value !== "object" || value === null) return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.top === "number" &&
    typeof g.right === "number" &&
    typeof g.bottom === "number" &&
    typeof g.left === "number" &&
    (g.radius === undefined || typeof g.radius === "number")
  );
}

// PRD §14.11.6. RECT/RADIUS both express as CSS clip-path:inset() (tier A) when the geometry
// carries the expected {top,right,bottom,left[,radius]} shape -- `geometry` is typed
// `unknown` in the schema itself, so a value that doesn't match that shape is routed to
// UNRESOLVED_RENDERING rather than guessing at a fallback. PATH clipping has no populated
// source data yet (no extractor emits real vector path geometry), so it's always tier C.
export function mapClip(clip: ClipIR): MappingResult<string> {
  if (clip.type === "PATH") {
    return {
      tier: "C",
      unresolvedReason:
        "PATH clip geometry is not yet extracted from any source; no CSS clip-path can be derived",
    };
  }

  if (!isInsetGeometry(clip.geometry)) {
    return {
      tier: "C",
      unresolvedReason: `${clip.type} clip is missing the {top,right,bottom,left} geometry needed to build clip-path:inset()`,
    };
  }

  const { top, right, bottom, left, radius } = clip.geometry;
  const round = radius !== undefined ? ` round ${radius}px` : "";
  return { tier: "A", css: `inset(${top}px ${right}px ${bottom}px ${left}px${round})` };
}
