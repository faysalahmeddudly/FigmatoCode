import { describe, expect, it } from "vitest";
import { computeFidelityScore } from "./fidelity-score.js";

describe("computeFidelityScore", () => {
  it("renormalizes across only the supplied components", () => {
    // geometry weight 0.20, perceptual weight 0.20 -> equal renormalized weighting.
    const result = computeFidelityScore({ geometry: 100, perceptual: 50 });
    expect(result.score).toBe(75);
    expect(result.componentsUsed.sort()).toEqual(["geometry", "perceptual"]);
    expect(result.componentsMissing.sort()).toEqual(["assets", "layout", "style", "typography"]);
  });

  it("does not silently treat missing components as perfect scores", () => {
    const partial = computeFidelityScore({ geometry: 50 });
    const full = computeFidelityScore({
      geometry: 50,
      layout: 100,
      typography: 100,
      style: 100,
      assets: 100,
      perceptual: 100,
    });
    // If missing components defaulted to 100, `partial` would equal `full`'s geometry-only
    // slice inflated by fake perfect scores. Renormalization keeps it at exactly the
    // geometry score instead.
    expect(partial.score).toBe(50);
    expect(full.score).toBe(90);
  });

  it("rounds the final score to two decimals", () => {
    const result = computeFidelityScore({ geometry: 33.333, perceptual: 66.666 });
    expect(Number.isInteger(result.score * 100)).toBe(true);
  });

  it("records the score profile id", () => {
    const result = computeFidelityScore({ geometry: 100 }, "custom-profile");
    expect(result.scoreProfileId).toBe("custom-profile");
  });
});
