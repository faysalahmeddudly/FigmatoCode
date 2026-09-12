import type { CompositingIR } from "@figma-engine/shared-contracts";
import type { MappingResult } from "./types.js";

export interface CompositingDeclarations {
  opacity: string;
  mixBlendMode?: string;
  isolation?: string;
}

// PRD §14.11.5: both Figma and CSS blend modes derive from the same W3C compositing/blending
// spec, so most map 1:1 (tier A). PASS_THROUGH has no literal CSS value -- it means "don't
// isolate this group's blending", approximated here as `normal` (tier B, documented).
// LINEAR_BURN/LINEAR_DODGE have no CSS mix-blend-mode equivalent at all (tier C).
const BLEND_MODE_MAP: Record<string, { css: string; tier: "A" | "B" }> = {
  NORMAL: { css: "normal", tier: "A" },
  PASS_THROUGH: { css: "normal", tier: "B" },
  DARKEN: { css: "darken", tier: "A" },
  MULTIPLY: { css: "multiply", tier: "A" },
  COLOR_BURN: { css: "color-burn", tier: "A" },
  LIGHTEN: { css: "lighten", tier: "A" },
  SCREEN: { css: "screen", tier: "A" },
  COLOR_DODGE: { css: "color-dodge", tier: "A" },
  OVERLAY: { css: "overlay", tier: "A" },
  SOFT_LIGHT: { css: "soft-light", tier: "A" },
  HARD_LIGHT: { css: "hard-light", tier: "A" },
  DIFFERENCE: { css: "difference", tier: "A" },
  EXCLUSION: { css: "exclusion", tier: "A" },
  HUE: { css: "hue", tier: "A" },
  SATURATION: { css: "saturation", tier: "A" },
  COLOR: { css: "color", tier: "A" },
  LUMINOSITY: { css: "luminosity", tier: "A" },
};

export function mapCompositing(compositing: CompositingIR): MappingResult<CompositingDeclarations> {
  const mapped = BLEND_MODE_MAP[compositing.blendMode];

  if (!mapped) {
    return {
      tier: "C",
      unresolvedReason: `Figma blend mode "${compositing.blendMode}" has no CSS mix-blend-mode equivalent`,
    };
  }

  const css: CompositingDeclarations = { opacity: String(compositing.opacity) };
  if (mapped.css !== "normal") css.mixBlendMode = mapped.css;
  if (compositing.isolation) css.isolation = "isolate";

  return mapped.tier === "B"
    ? {
        tier: "B",
        css,
        unresolvedReason:
          "PASS_THROUGH has no CSS equivalent; approximated as no blend-mode isolation",
      }
    : { tier: "A", css };
}
