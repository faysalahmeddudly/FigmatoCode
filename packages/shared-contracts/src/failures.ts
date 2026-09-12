import { z } from "zod";

// PRD §21.1 typed failure classes.
export const FailureClassSchema = z.enum([
  "INPUT_INVALID",
  "AUTH_FAILED",
  "FIGMA_RATE_LIMIT",
  "FIGMA_UNAVAILABLE",
  "NODE_NOT_FOUND",
  "UNSUPPORTED_NODE",
  "FONT_MISSING",
  "ASSET_MISSING",
  "ASSET_CORRUPT",
  "RENDER_TIMEOUT",
  "BROWSER_CRASH",
  "PAGE_NOT_READY",
  "DOM_METRICS_FAILED",
  "COMPARISON_FAILED",
  "PATCH_INVALID",
  "PATCH_BOUNDARY_VIOLATION",
  "BENCHMARK_GATE_FAILED",
  "RESOURCE_LIMIT_EXCEEDED",
  // PRD §21.2A visual/compositing failure classes.
  "GRADIENT_MAPPING_FAILED",
  "EFFECT_MAPPING_FAILED",
  "BLUR_MAPPING_FAILED",
  "MASK_MAPPING_FAILED",
  "CLIP_MAPPING_FAILED",
  "STACKING_ORDER_MISMATCH",
  "UNEXPECTED_OVERLAY",
  "UNEXPECTED_COLLISION",
  "ABSOLUTE_POSITION_MISMATCH",
  "BLEND_MODE_MISMATCH",
  "PAINT_ORDER_MISMATCH",
]);
export type FailureClass = z.infer<typeof FailureClassSchema>;

// PRD §9 unresolved case taxonomy — the Phase 2/3 → Phase 4 handoff contract.
export const UnresolvedTaxonomySchema = z.enum([
  "UNRESOLVED_LAYOUT",
  "UNRESOLVED_TYPOGRAPHY",
  "UNRESOLVED_ASSET",
  "UNRESOLVED_RENDERING",
  "UNRESOLVED_RESPONSIVE",
  "UNRESOLVED_MAPPING",
  "UNRESOLVED_SOURCE_AMBIGUITY",
]);
export type UnresolvedTaxonomy = z.infer<typeof UnresolvedTaxonomySchema>;

// PRD §16.1 root-cause classes, plus MAPPING: §16.1A's normative routing table (ADR-011) has a
// "MAPPING -> UNRESOLVED_MAPPING" row that §16.1's own enumeration omits. §16.1A governs routing,
// so MAPPING is included here to keep this the single source of truth the mapping table requires.
export const RootCauseClassSchema = z.enum([
  "POSITION",
  "SIZE",
  "GAP",
  "PADDING",
  "ALIGNMENT",
  "TYPOGRAPHY",
  "PAINT",
  "GRADIENT",
  "SHADOW",
  "BLUR",
  "CLIP_MASK",
  "COMPOSITING",
  "STACKING",
  "TRANSFORM",
  "CONSTRAINT",
  "ASSET",
  "CONTENT_FLOW",
  "RESPONSIVE",
  "MAPPING",
  "UNKNOWN",
]);
export type RootCauseClass = z.infer<typeof RootCauseClassSchema>;

// PRD §16.1A normative root-cause -> unresolved-taxonomy mapping (ADR-011: the only routing table).
export const ROOT_CAUSE_TO_UNRESOLVED: Record<RootCauseClass, UnresolvedTaxonomy> = {
  POSITION: "UNRESOLVED_LAYOUT",
  SIZE: "UNRESOLVED_LAYOUT",
  GAP: "UNRESOLVED_LAYOUT",
  PADDING: "UNRESOLVED_LAYOUT",
  ALIGNMENT: "UNRESOLVED_LAYOUT",
  CONSTRAINT: "UNRESOLVED_LAYOUT",
  CONTENT_FLOW: "UNRESOLVED_LAYOUT",
  TYPOGRAPHY: "UNRESOLVED_TYPOGRAPHY",
  ASSET: "UNRESOLVED_ASSET",
  PAINT: "UNRESOLVED_RENDERING",
  GRADIENT: "UNRESOLVED_RENDERING",
  SHADOW: "UNRESOLVED_RENDERING",
  BLUR: "UNRESOLVED_RENDERING",
  CLIP_MASK: "UNRESOLVED_RENDERING",
  COMPOSITING: "UNRESOLVED_RENDERING",
  STACKING: "UNRESOLVED_RENDERING",
  TRANSFORM: "UNRESOLVED_RENDERING",
  RESPONSIVE: "UNRESOLVED_RESPONSIVE",
  MAPPING: "UNRESOLVED_MAPPING",
  UNKNOWN: "UNRESOLVED_SOURCE_AMBIGUITY",
};
