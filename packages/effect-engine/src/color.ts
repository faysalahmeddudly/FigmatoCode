import type { Rgba } from "@figma-engine/shared-contracts";

// Mirrors code-generator's color.ts. Duplicated (not imported) per §25: each engine package
// stays independently buildable/testable rather than reaching into a sibling engine for a
// three-line utility.
export function rgbaToCss(color: Rgba): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}
