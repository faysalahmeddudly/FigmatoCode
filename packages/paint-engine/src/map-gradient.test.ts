import { describe, expect, it } from "vitest";
import { mapGradient } from "./map-gradient.js";

const stops = [
  { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
  { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
];

describe("mapGradient", () => {
  it("maps a linear gradient to CSS linear-gradient at tier B", () => {
    const result = mapGradient({ type: "LINEAR", angle: 90, stops });
    expect(result.tier).toBe("B");
    expect(result.css).toBe(
      "linear-gradient(90deg, rgba(255, 0, 0, 1) 0.00%, rgba(0, 0, 255, 1) 100.00%)",
    );
  });

  it("defaults linear angle to 180deg (top to bottom) when unspecified", () => {
    const result = mapGradient({ type: "LINEAR", stops });
    expect(result.css).toContain("linear-gradient(180deg");
  });

  it("maps a radial gradient to a circular CSS approximation at tier B", () => {
    const result = mapGradient({ type: "RADIAL", stops, center: { x: 0.5, y: 0.5 } });
    expect(result.tier).toBe("B");
    expect(result.css).toContain("radial-gradient(circle at 50% 50%");
  });

  it("maps an angular gradient to conic-gradient at tier B", () => {
    const result = mapGradient({ type: "ANGULAR", stops, angle: 45 });
    expect(result.tier).toBe("B");
    expect(result.css).toContain("conic-gradient(from 45deg");
  });

  it("routes a diamond gradient to tier C with no CSS output, not a silent approximation", () => {
    const result = mapGradient({ type: "DIAMOND", stops });
    expect(result.tier).toBe("C");
    expect(result.css).toBeUndefined();
    expect(result.unresolvedReason).toBeTruthy();
  });
});
