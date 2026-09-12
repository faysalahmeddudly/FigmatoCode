import type { ShadowIR } from "@figma-engine/shared-contracts";
import { rgbaToCss } from "./color.js";
import type { MappingResult } from "./types.js";

function formatShadow(shadow: ShadowIR): string {
  const spread = shadow.spread ?? 0;
  const inset = shadow.type === "INNER" ? " inset" : "";
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${spread}px ${rgbaToCss(shadow.color)}${inset}`;
}

// PRD §14.11.3: Figma's drop/inner shadow model maps directly onto CSS box-shadow
// (offset-x offset-y blur spread color[, inset]) -- tier A, no approximation needed.
export function mapShadow(shadow: ShadowIR): MappingResult<string> {
  return { tier: "A", css: formatShadow(shadow) };
}

// Multiple shadows compose as a comma-separated box-shadow list in both Figma and CSS.
export function mapShadows(shadows: ShadowIR[]): MappingResult<string> | undefined {
  if (shadows.length === 0) return undefined;
  return { tier: "A", css: shadows.map(formatShadow).join(", ") };
}
