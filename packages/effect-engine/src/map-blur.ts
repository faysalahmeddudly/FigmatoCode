import type { BlurIR } from "@figma-engine/shared-contracts";
import type { MappingResult } from "./types.js";

// PRD §14.11.4. Tier B, not A: Figma's blur radius parameter and CSS's `blur()` standard
// deviation follow different Gaussian-blur conventions, so the widely-used radius/2
// conversion is a documented approximation, not an exact match -- claiming tier A here would
// be exactly the silent-approximation §32.2 forbids.
const BLUR_RADIUS_TO_CSS_STDDEV = 0.5;

export function mapBlur(blur: BlurIR): MappingResult<string> {
  const stdDev = blur.radius * BLUR_RADIUS_TO_CSS_STDDEV;

  if (blur.type === "BACKGROUND") {
    return {
      tier: "B",
      css: `blur(${stdDev}px)`,
      unresolvedReason:
        "backdrop-filter blur radius is an approximation of Figma's background blur algorithm",
    };
  }

  // LAYER and OBJECT blur both become CSS filter:blur() on the element itself; Figma
  // distinguishes them by what else is affected (whole layer subtree vs. a single object),
  // which this package doesn't decide -- that's the caller's placement choice, not a
  // different CSS value.
  return {
    tier: "B",
    css: `blur(${stdDev}px)`,
    unresolvedReason: "filter blur radius is an approximation of Figma's blur algorithm",
  };
}
