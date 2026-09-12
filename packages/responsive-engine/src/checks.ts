import type { Rect } from "@figma-engine/shared-contracts";
import type { Breakpoint } from "./breakpoints.js";
import type { ResponsiveFailure, ViewportSnapshot } from "./types.js";

const CONTAINMENT_TOLERANCE_PX = 1;
const MIN_COLLISION_AREA_PX2 = 4;
const WRAP_HEIGHT_GROWTH_RATIO = 1.3;
const DISPLACEMENT_FRACTION_TOLERANCE = 0.15;
const INSTABILITY_TOLERANCE_PX = 1;
const ASPECT_RATIO_TOLERANCE = 0.02;

function intersectionArea(a: Rect, b: Rect): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

// PRD §17.2 "overflow": a child whose measured rect extends outside its own parent's rect is
// only meaningful for parents that aren't expected to scroll/clip their own overflow --
// callers that know a container intentionally scrolls should exclude its children via
// `isScrollContainer`.
export function checkOverflow(
  snapshot: ViewportSnapshot,
  isScrollContainer?: (nodeId: string) => boolean,
): ResponsiveFailure[] {
  const failures: ResponsiveFailure[] = [];

  for (const [nodeId, rect] of Object.entries(snapshot.rects)) {
    const parentId = snapshot.parentIds[nodeId];
    if (!parentId) continue;
    if (isScrollContainer?.(parentId)) continue;

    const parentRect = snapshot.rects[parentId];
    if (!parentRect) continue;

    const overflowsRight =
      rect.x + rect.width > parentRect.x + parentRect.width + CONTAINMENT_TOLERANCE_PX;
    const overflowsBottom =
      rect.y + rect.height > parentRect.y + parentRect.height + CONTAINMENT_TOLERANCE_PX;
    const overflowsLeft = rect.x < parentRect.x - CONTAINMENT_TOLERANCE_PX;
    const overflowsTop = rect.y < parentRect.y - CONTAINMENT_TOLERANCE_PX;

    if (overflowsRight || overflowsBottom || overflowsLeft || overflowsTop) {
      failures.push({
        kind: "OVERFLOW",
        breakpoint: snapshot.breakpoint,
        nodeId,
        detail: `Node "${nodeId}" extends outside parent "${parentId}" at ${snapshot.breakpoint}px`,
      });
    }
  }

  return failures;
}

// PRD §17.2 "horizontal scroll": the root/frame rendering wider than the viewport it was
// measured at.
export function checkHorizontalScroll(snapshot: ViewportSnapshot): ResponsiveFailure[] {
  const rootRect = snapshot.rects[snapshot.rootId];
  if (!rootRect) return [];
  if (rootRect.width > snapshot.viewportWidth + CONTAINMENT_TOLERANCE_PX) {
    return [
      {
        kind: "HORIZONTAL_SCROLL",
        breakpoint: snapshot.breakpoint,
        nodeId: snapshot.rootId,
        detail: `Root renders at ${rootRect.width}px, wider than the ${snapshot.viewportWidth}px viewport`,
      },
    ];
  }
  return [];
}

// PRD §17.2 "collision": sibling rects that overlap when nothing marks that overlap as
// intended. `allowOverlap` lets a caller exclude pairs whose NodeIR layout (absolute
// positioning, intentional stacking) makes overlap expected -- responsive-engine has no
// NodeIR of its own to check that against (§25 boundary), so it defaults to flagging every
// overlap above the noise floor.
export function checkCollision(
  snapshot: ViewportSnapshot,
  allowOverlap?: (aId: string, bId: string) => boolean,
): ResponsiveFailure[] {
  const byParent = new Map<string, string[]>();
  for (const [nodeId, parentId] of Object.entries(snapshot.parentIds)) {
    if (!parentId) continue;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(nodeId);
    byParent.set(parentId, siblings);
  }

  const failures: ResponsiveFailure[] = [];
  for (const siblings of byParent.values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const aId = siblings[i]!;
        const bId = siblings[j]!;
        const a = snapshot.rects[aId];
        const b = snapshot.rects[bId];
        if (!a || !b) continue;
        if (allowOverlap?.(aId, bId)) continue;

        const area = intersectionArea(a, b);
        if (area > MIN_COLLISION_AREA_PX2) {
          failures.push({
            kind: "COLLISION",
            breakpoint: snapshot.breakpoint,
            nodeId: aId,
            detail: `Node "${aId}" overlaps sibling "${bId}" by ${area.toFixed(1)}px² at ${snapshot.breakpoint}px`,
          });
        }
      }
    }
  }
  return failures;
}

// PRD §17.2 "unexpected wrap": a node's measured height growing far beyond its baseline
// height at another breakpoint is the geometric signature of text (or wrapping content)
// breaking onto additional lines it didn't occupy at baseline.
export function checkUnexpectedWrap(
  snapshot: ViewportSnapshot,
  baseline: ViewportSnapshot,
): ResponsiveFailure[] {
  const failures: ResponsiveFailure[] = [];
  for (const [nodeId, rect] of Object.entries(snapshot.rects)) {
    const baselineRect = baseline.rects[nodeId];
    if (!baselineRect || baselineRect.height <= 0) continue;
    if (
      rect.height / baselineRect.height >= WRAP_HEIGHT_GROWTH_RATIO &&
      rect.width < baselineRect.width
    ) {
      failures.push({
        kind: "UNEXPECTED_WRAP",
        breakpoint: snapshot.breakpoint,
        nodeId,
        detail: `Node "${nodeId}" grew from ${baselineRect.height}px to ${rect.height}px tall relative to the ${baseline.breakpoint}px baseline`,
      });
    }
  }
  return failures;
}

// PRD §17.2 "displacement": a coarse, documented heuristic -- it flags a node whose position
// within its parent (as a fraction of parent width/height) shifts by more than a fixed
// tolerance relative to baseline, without knowing whether that shift was an intended
// consequence of the node's own sizing/alignment rules (responsive-engine has no NodeIR
// access, per §25). This is meant to catch gross, unexplained repositioning, not to replace
// per-property responsive-layout verification.
export function checkDisplacement(
  snapshot: ViewportSnapshot,
  baseline: ViewportSnapshot,
): ResponsiveFailure[] {
  const failures: ResponsiveFailure[] = [];
  for (const [nodeId, rect] of Object.entries(snapshot.rects)) {
    const parentId = snapshot.parentIds[nodeId];
    if (!parentId) continue;
    const parentRect = snapshot.rects[parentId];
    const baselineRect = baseline.rects[nodeId];
    const baselineParentRect = baseline.rects[parentId];
    if (!parentRect || !baselineRect || !baselineParentRect) continue;
    if (parentRect.width <= 0 || baselineParentRect.width <= 0) continue;

    const fraction = (rect.x - parentRect.x) / parentRect.width;
    const baselineFraction = (baselineRect.x - baselineParentRect.x) / baselineParentRect.width;

    if (Math.abs(fraction - baselineFraction) > DISPLACEMENT_FRACTION_TOLERANCE) {
      failures.push({
        kind: "DISPLACEMENT",
        breakpoint: snapshot.breakpoint,
        nodeId,
        detail: `Node "${nodeId}" sits at ${(fraction * 100).toFixed(1)}% of its parent's width vs ${(baselineFraction * 100).toFixed(1)}% at the ${baseline.breakpoint}px baseline`,
      });
    }
  }
  return failures;
}

// PRD §17.2 "container instability": a container's own width oscillating (growing then
// shrinking, or vice versa) across ascending viewport widths for the same content, rather
// than changing monotonically as real responsive containers should.
export function checkContainerInstability(snapshots: ViewportSnapshot[]): ResponsiveFailure[] {
  const ordered = [...snapshots].sort((a, b) => a.viewportWidth - b.viewportWidth);
  const failures: ResponsiveFailure[] = [];
  const nodeIds = new Set(ordered.flatMap((s) => Object.keys(s.rects)));

  for (const nodeId of nodeIds) {
    const widths = ordered
      .map((s) => ({ breakpoint: s.breakpoint, width: s.rects[nodeId]?.width }))
      .filter((w): w is { breakpoint: Breakpoint; width: number } => w.width !== undefined);

    let lastSign = 0;
    for (let i = 1; i < widths.length; i++) {
      const delta = widths[i]!.width - widths[i - 1]!.width;
      if (Math.abs(delta) <= INSTABILITY_TOLERANCE_PX) continue;
      const sign = Math.sign(delta);
      if (lastSign !== 0 && sign !== lastSign) {
        failures.push({
          kind: "CONTAINER_INSTABILITY",
          breakpoint: widths[i]!.breakpoint,
          nodeId,
          detail: `Node "${nodeId}" width reverses direction at ${widths[i]!.breakpoint}px (non-monotonic across breakpoints)`,
        });
      }
      lastSign = sign;
    }
  }

  return failures;
}

// PRD §17.2 "aspect ratio": nodes with a required aspect ratio (from NodeIR.layout.aspectRatio)
// must keep it as they resize. `expectedRatios` is nodeId -> width/height, supplied by the
// caller since responsive-engine doesn't read NodeIR directly.
export function checkAspectRatio(
  snapshot: ViewportSnapshot,
  expectedRatios: Record<string, number>,
): ResponsiveFailure[] {
  const failures: ResponsiveFailure[] = [];
  for (const [nodeId, expectedRatio] of Object.entries(expectedRatios)) {
    const rect = snapshot.rects[nodeId];
    if (!rect || rect.height <= 0 || expectedRatio <= 0) continue;
    const actualRatio = rect.width / rect.height;
    if (Math.abs(actualRatio - expectedRatio) / expectedRatio > ASPECT_RATIO_TOLERANCE) {
      failures.push({
        kind: "ASPECT_RATIO",
        breakpoint: snapshot.breakpoint,
        nodeId,
        detail: `Node "${nodeId}" aspect ratio ${actualRatio.toFixed(3)} deviates from the required ${expectedRatio.toFixed(3)} at ${snapshot.breakpoint}px`,
      });
    }
  }
  return failures;
}
