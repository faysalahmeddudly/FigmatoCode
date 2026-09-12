import { checkOverflow } from "@figma-engine/responsive-engine";
import type { ResponsiveFailure, ViewportSnapshot } from "@figma-engine/responsive-engine";
import type { StressTier } from "./stress-content.js";
import { checkContentHiding, type ContentFlowFailure } from "./content-hiding.js";

export interface StressNodeContent {
  injected: string;
  renderedVisibleLength: number;
  overflow: "visible" | "hidden" | "scroll" | "auto";
  hasReferenceBackedTruncation: boolean;
}

export interface StressRenderResult {
  tier: StressTier;
  snapshot: ViewportSnapshot;
  contentByNode: Record<string, StressNodeContent>;
}

export interface StressSuiteFailures {
  overflow: ResponsiveFailure[];
  contentHiding: ContentFlowFailure[];
}

// Composes responsive-engine's geometric overflow check (reused as-is -- a stress render is
// just another rendered snapshot) with flow-engine's own content-hiding check, across every
// tier in one pass.
export function runStressSuite(results: StressRenderResult[]): StressSuiteFailures {
  const overflow: ResponsiveFailure[] = [];
  const contentHiding: ContentFlowFailure[] = [];

  for (const result of results) {
    overflow.push(...checkOverflow(result.snapshot));

    for (const [nodeId, content] of Object.entries(result.contentByNode)) {
      const failure = checkContentHiding(nodeId, result.tier, content);
      if (failure) contentHiding.push(failure);
    }
  }

  return { overflow, contentHiding };
}
