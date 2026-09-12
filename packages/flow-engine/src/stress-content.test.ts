import { describe, expect, it } from "vitest";
import { generateStressContent } from "./stress-content.js";

const SOURCE = "The quick brown fox jumps over the lazy dog";

describe("generateStressContent", () => {
  it("returns the content unchanged at NORMAL", () => {
    expect(generateStressContent(SOURCE, "NORMAL")).toBe(SOURCE);
  });

  it("truncates to roughly a quarter of the length at SHORT", () => {
    const result = generateStressContent(SOURCE, "SHORT");
    expect(result.length).toBeLessThan(SOURCE.length);
    expect(SOURCE.startsWith(result)).toBe(true);
  });

  it("never produces empty content, even for a single-character source at SHORT", () => {
    expect(generateStressContent("x", "SHORT").length).toBeGreaterThan(0);
  });

  it("extends content to roughly 3x length at LONG, derived from the source", () => {
    const result = generateStressContent(SOURCE, "LONG");
    expect(result.length).toBeGreaterThanOrEqual(SOURCE.length * 3);
    expect(result.includes(SOURCE)).toBe(true);
  });

  it("extends content to roughly 8x length at EXTREME", () => {
    const result = generateStressContent(SOURCE, "EXTREME");
    expect(result.length).toBeGreaterThanOrEqual(SOURCE.length * 8);
  });
});
