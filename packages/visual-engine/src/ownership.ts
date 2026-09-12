import type { DesignDocument, Rect } from "@figma-engine/shared-contracts";
import type { DiffRegion } from "./regions.js";

// Mirrors geometry-engine's toFrameLocal: the reference NodeIR's absolute rect is in
// Figma-canvas coordinates, but diff regions are in the same frame-local pixel space as the
// rendered screenshot, so node rects need the same root-relative translation before either
// can be compared to the other. Kept local rather than importing geometry-engine, per §25.0A
// (visual-engine owns comparison, not a dependency on another comparison engine).
function toFrameLocal(nodeAbsolute: Rect, rootAbsolute: Rect): Rect {
  return {
    x: nodeAbsolute.x - rootAbsolute.x,
    y: nodeAbsolute.y - rootAbsolute.y,
    width: nodeAbsolute.width,
    height: nodeAbsolute.height,
  };
}

function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

// PRD §15.2 step 6: "nearest NodeIR ownership" for a diff region -- the smallest (most
// specific) node whose frame-local rect contains the region's center point.
export function findOwningNodeId(region: DiffRegion, doc: DesignDocument): string | undefined {
  const root = doc.nodes[doc.rootId];
  if (!root) return undefined;

  const centerX = region.boundingBox.x + region.boundingBox.width / 2;
  const centerY = region.boundingBox.y + region.boundingBox.height / 2;

  let bestId: string | undefined;
  let bestArea = Infinity;

  for (const [id, node] of Object.entries(doc.nodes)) {
    if (!node.visible) continue;
    const frameLocal = toFrameLocal(node.absolute, root.absolute);
    if (!contains(frameLocal, centerX, centerY)) continue;

    const area = frameLocal.width * frameLocal.height;
    if (area < bestArea) {
      bestArea = area;
      bestId = id;
    }
  }

  return bestId;
}
