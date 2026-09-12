import { describe, expect, it } from "vitest";
import { isAcceptable } from "./score-acceptance.js";

function base() {
  return {
    scoreBefore: 90,
    scoreAfter: 96,
    hasCriticalRegression: false,
    candidateValid: true,
    renderReady: true,
  };
}

describe("isAcceptable", () => {
  it("accepts an improvement past the default threshold", () => {
    expect(isAcceptable(base())).toBe(true);
  });

  it("rejects an improvement that doesn't clear the threshold", () => {
    expect(isAcceptable({ ...base(), scoreAfter: 90.02 })).toBe(false);
  });

  it("rejects a critical regression even with a higher score", () => {
    expect(isAcceptable({ ...base(), hasCriticalRegression: true })).toBe(false);
  });

  it("rejects an invalid candidate even with a higher score", () => {
    expect(isAcceptable({ ...base(), candidateValid: false })).toBe(false);
  });

  it("rejects when the render never reached readiness", () => {
    expect(isAcceptable({ ...base(), renderReady: false })).toBe(false);
  });

  it("respects a custom improvement threshold", () => {
    expect(isAcceptable({ ...base(), scoreAfter: 90.5 }, 1)).toBe(false);
    expect(isAcceptable({ ...base(), scoreAfter: 92 }, 1)).toBe(true);
  });
});
