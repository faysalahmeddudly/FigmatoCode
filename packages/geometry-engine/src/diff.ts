import type { DesignDocument, Rect } from "@figma-engine/shared-contracts";

export interface GeometryDiff {
  nodeId: string;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  dxRel: number;
  dyRel: number;
  dwRel: number;
  dhRel: number;
}

export interface GeometryComparisonResult {
  diffs: GeometryDiff[];
  missingNodeIds: string[];
}

function toFrameLocal(nodeAbsolute: Rect, rootAbsolute: Rect): Rect {
  return {
    x: nodeAbsolute.x - rootAbsolute.x,
    y: nodeAbsolute.y - rootAbsolute.y,
    width: nodeAbsolute.width,
    height: nodeAbsolute.height,
  };
}

// Mirrors figma-parser's relativeRect: geometry relative to the immediate parent, with the
// root itself using its own (frame-local) absolute rect as its "relative" position.
function relativeTo(rect: Rect, parent: Rect | undefined): Rect {
  if (!parent) return { ...rect };
  return {
    x: rect.x - parent.x,
    y: rect.y - parent.y,
    width: rect.width,
    height: rect.height,
  };
}

// PRD §15.3: dx/dy/dw/dh from absolute geometry, dxRel/dyRel/dwRel/dhRel from relative
// geometry. `domMetrics` are getBoundingClientRect()-style rects measured from the rendered
// candidate page, keyed by the same internalId as the reference NodeIR -- naturally
// frame-local (the page IS the frame), so the reference's Figma-canvas absolute coordinates
// are first translated into the same frame-local space via the root's own absolute rect.
export function computeGeometryDiffs(
  doc: DesignDocument,
  domMetrics: Record<string, Rect>,
): GeometryComparisonResult {
  const root = doc.nodes[doc.rootId];
  if (!root) throw new Error(`Document root "${doc.rootId}" not found in nodes`);
  const rootAbsolute = root.absolute;

  const diffs: GeometryDiff[] = [];
  const missingNodeIds: string[] = [];

  for (const [id, node] of Object.entries(doc.nodes)) {
    const candidateAbs = domMetrics[id];
    if (!candidateAbs) {
      missingNodeIds.push(id);
      continue;
    }

    const referenceAbs = toFrameLocal(node.absolute, rootAbsolute);
    const parentCandidateAbs = node.parentId ? domMetrics[node.parentId] : undefined;
    const candidateRel = relativeTo(candidateAbs, parentCandidateAbs);

    // The root's own `relative` field (per figma-parser's relativeRect) is a special case:
    // with no parent to be relative to, it falls back to Figma-canvas absolute coordinates,
    // not a frame-local position. That's meaningless to diff against a DOM-measured
    // candidate (which is inherently frame-local), so the root compares against its own
    // frame-local reference absolute instead.
    const referenceRel = node.parentId ? node.relative : referenceAbs;

    diffs.push({
      nodeId: id,
      dx: candidateAbs.x - referenceAbs.x,
      dy: candidateAbs.y - referenceAbs.y,
      dw: candidateAbs.width - referenceAbs.width,
      dh: candidateAbs.height - referenceAbs.height,
      dxRel: candidateRel.x - referenceRel.x,
      dyRel: candidateRel.y - referenceRel.y,
      dwRel: candidateRel.width - referenceRel.width,
      dhRel: candidateRel.height - referenceRel.height,
    });
  }

  return { diffs, missingNodeIds };
}
