import { describe, expect, it } from "vitest";
import { computePerceptualSimilarity } from "./perceptual.js";

describe("computePerceptualSimilarity", () => {
  it("is 100 for zero mismatches", () => {
    expect(computePerceptualSimilarity(0, 100)).toBe(100);
  });

  it("is 0 when every pixel mismatches", () => {
    expect(computePerceptualSimilarity(100, 100)).toBe(0);
  });

  it("scales linearly with mismatch ratio", () => {
    expect(computePerceptualSimilarity(25, 100)).toBe(75);
  });
});
