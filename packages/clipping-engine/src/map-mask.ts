import type { MaskIR } from "@figma-engine/shared-contracts";
import type { MappingResult } from "./types.js";

// PRD §14.11.6 masks. A CSS mask-image needs a rendered image of the mask source layer
// (mask-image: url(...)), which requires an asset-rendering pipeline that renders an
// arbitrary node subtree to a raster/vector image -- that pipeline doesn't exist yet for any
// mask type, so every mask always routes to UNRESOLVED_RENDERING rather than emitting a mask
// declaration that points at nothing.
export function mapMask(mask: MaskIR): MappingResult<string> {
  return {
    tier: "C",
    unresolvedReason: `${mask.type} masks require rendering the mask source layer to an image; no such pipeline exists yet`,
  };
}
