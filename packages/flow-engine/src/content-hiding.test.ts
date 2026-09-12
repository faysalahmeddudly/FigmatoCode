import { describe, expect, it } from "vitest";
import { checkContentHiding } from "./content-hiding.js";

describe("checkContentHiding", () => {
  it("flags clipped content with no reference-backed truncation evidence", () => {
    const failure = checkContentHiding("n1", "EXTREME", {
      injected: "a".repeat(500),
      renderedVisibleLength: 100,
      overflow: "hidden",
      hasReferenceBackedTruncation: false,
    });
    expect(failure?.kind).toBe("CONTENT_HIDDEN_WITHOUT_EVIDENCE");
  });

  it("does not flag clipping the reference itself evidences (e.g. an authored line-clamp)", () => {
    const failure = checkContentHiding("n1", "EXTREME", {
      injected: "a".repeat(500),
      renderedVisibleLength: 100,
      overflow: "hidden",
      hasReferenceBackedTruncation: true,
    });
    expect(failure).toBeUndefined();
  });

  it("does not flag content that overflows visibly (not hidden/scroll-clipped)", () => {
    const failure = checkContentHiding("n1", "EXTREME", {
      injected: "a".repeat(500),
      renderedVisibleLength: 100,
      overflow: "visible",
      hasReferenceBackedTruncation: false,
    });
    expect(failure).toBeUndefined();
  });

  it("does not flag content that fits entirely", () => {
    const failure = checkContentHiding("n1", "SHORT", {
      injected: "short",
      renderedVisibleLength: 5,
      overflow: "hidden",
      hasReferenceBackedTruncation: false,
    });
    expect(failure).toBeUndefined();
  });
});
