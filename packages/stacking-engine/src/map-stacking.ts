import type { StackingIR } from "@figma-engine/shared-contracts";
import type { MappingResult } from "./types.js";

export interface StackingDeclarations {
  position: string;
  zIndex?: string;
  isolation?: string;
}

// PRD §14.11.7: position and z-index are core CSS box-model properties with no ambiguity
// relative to Figma's own stacking model -- tier A. `stackingContext` becomes
// isolation:isolate, the standard way to force a new stacking context without side effects
// on layout or paint order elsewhere on the page.
export function mapStacking(stacking: StackingIR): MappingResult<StackingDeclarations> {
  const css: StackingDeclarations = { position: stacking.position };
  if (stacking.zIndex !== "auto") css.zIndex = String(stacking.zIndex);
  if (stacking.stackingContext) css.isolation = "isolate";
  return { tier: "A", css };
}
