import type { StressTier } from "./stress-content.js";

export interface ContentHidingCheckInput {
  injected: string;
  renderedVisibleLength: number;
  overflow: "visible" | "hidden" | "scroll" | "auto";
  hasReferenceBackedTruncation: boolean;
}

export interface ContentFlowFailure {
  tier: StressTier;
  nodeId: string;
  kind: "CONTENT_HIDDEN_WITHOUT_EVIDENCE";
  detail: string;
}

// PRD §17.3: "a fix merely hiding content is rejected without reference-backed evidence."
// Content clipped by overflow:hidden/scroll is only acceptable when a specific, evidenced
// rule says the reference design itself truncates (e.g. a fixed line-clamp visible in the
// Figma frame) -- `hasReferenceBackedTruncation` is that evidence, supplied by the caller,
// never assumed.
export function checkContentHiding(
  nodeId: string,
  tier: StressTier,
  input: ContentHidingCheckInput,
): ContentFlowFailure | undefined {
  const isClipped = input.renderedVisibleLength < input.injected.length;
  const clipsOverflow = input.overflow === "hidden" || input.overflow === "scroll";

  if (isClipped && clipsOverflow && !input.hasReferenceBackedTruncation) {
    const hiddenChars = input.injected.length - input.renderedVisibleLength;
    return {
      tier,
      nodeId,
      kind: "CONTENT_HIDDEN_WITHOUT_EVIDENCE",
      detail: `Node "${nodeId}" clipped ${hiddenChars} character(s) at ${tier} stress with no reference-backed truncation evidence`,
    };
  }

  return undefined;
}
