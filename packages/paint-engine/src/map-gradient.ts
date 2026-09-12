import type { GradientIR } from "@figma-engine/shared-contracts";
import { rgbaToCss } from "./color.js";
import type { MappingResult } from "./types.js";

function formatStops(gradient: GradientIR): string {
  return gradient.stops
    .map((stop) => `${rgbaToCss(stop.color)} ${(stop.position * 100).toFixed(2)}%`)
    .join(", ");
}

// PRD §14.11.2. Every tier here is B, not A: color stops themselves translate exactly, but
// the geometric parameters (angle convention, independent x/y radius, conic start angle) are
// not verified against Figma's own gradient-parameter definitions -- no extractor populates
// real gradient data yet (figma-parser's map-paint.ts still defers gradients), so claiming
// tier A pixel-accuracy here would be an unfounded claim, not a measured one (§32.2).
export function mapGradient(gradient: GradientIR): MappingResult<string> {
  const stops = formatStops(gradient);

  switch (gradient.type) {
    case "LINEAR": {
      const angle = gradient.angle ?? 180;
      return {
        tier: "B",
        css: `linear-gradient(${angle}deg, ${stops})`,
        unresolvedReason:
          "linear-gradient angle convention is assumed to match CSS degrees, not yet verified against Figma's own angle definition",
      };
    }
    case "RADIAL": {
      const cx = (gradient.center?.x ?? 0.5) * 100;
      const cy = (gradient.center?.y ?? 0.5) * 100;
      return {
        tier: "B",
        css: `radial-gradient(circle at ${cx}% ${cy}%, ${stops})`,
        unresolvedReason:
          "CSS radial-gradient cannot express Figma's independent x/y radius via percentages; falls back to a circular approximation",
      };
    }
    case "ANGULAR": {
      const cx = (gradient.center?.x ?? 0.5) * 100;
      const cy = (gradient.center?.y ?? 0.5) * 100;
      return {
        tier: "B",
        css: `conic-gradient(from ${gradient.angle ?? 0}deg at ${cx}% ${cy}%, ${stops})`,
        unresolvedReason:
          "conic-gradient start-angle convention is assumed to match CSS degrees, not yet verified against Figma's own definition",
      };
    }
    case "DIAMOND":
      return {
        tier: "C",
        unresolvedReason:
          "no CSS primitive expresses a diamond gradient; routes to UNRESOLVED_RENDERING",
      };
  }
}
