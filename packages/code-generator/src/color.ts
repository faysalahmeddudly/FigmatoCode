import type { Rgba } from "@figma-engine/shared-contracts";

// Rgba channels are normalized [0,1] (PRD §14.2 canonical units); CSS rgba() needs 0-255 for
// color channels and keeps alpha in [0,1].
export function rgbaToCss(color: Rgba): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}
