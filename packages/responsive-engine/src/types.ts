import type { Rect } from "@figma-engine/shared-contracts";
import type { Breakpoint } from "./breakpoints.js";

// One rendered/measured snapshot at a given breakpoint. `rects` mirrors the renderer
// package's domMetrics shape (nodeId -> frame-local Rect) so a caller can feed real
// measurements straight through without reshaping them.
export interface ViewportSnapshot {
  breakpoint: Breakpoint;
  viewportWidth: number;
  rootId: string;
  rects: Record<string, Rect>;
  parentIds: Record<string, string | null>;
}

// PRD §17.2 check categories.
export type ResponsiveFailureKind =
  | "OVERFLOW"
  | "COLLISION"
  | "UNEXPECTED_WRAP"
  | "DISPLACEMENT"
  | "CONTAINER_INSTABILITY"
  | "HORIZONTAL_SCROLL"
  | "ASPECT_RATIO";

export interface ResponsiveFailure {
  kind: ResponsiveFailureKind;
  breakpoint: Breakpoint;
  nodeId: string;
  detail: string;
}
