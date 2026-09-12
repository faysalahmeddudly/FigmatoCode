import type { StackingIR } from "@figma-engine/shared-contracts";

// PRD §14.11.7 `paintOrder`: a deterministic document-order tie-break for nodes that share
// the same effective z-index, since CSS itself only breaks such ties by DOM source order --
// this comparator is what decides that DOM order at generation time, not a CSS property
// (CSS `paint-order` only affects SVG fill/stroke/marker painting, not general stacking, so
// emitting it as a declaration here would be meaningless for HTML elements).
export function compareStackingOrder(a: StackingIR, b: StackingIR): number {
  const aZ = a.zIndex === "auto" ? 0 : a.zIndex;
  const bZ = b.zIndex === "auto" ? 0 : b.zIndex;
  if (aZ !== bZ) return aZ - bZ;
  return a.paintOrder - b.paintOrder;
}
