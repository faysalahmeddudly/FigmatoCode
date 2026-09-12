import { describe, expect, it } from "vitest";
import { mapCompositing } from "./map-compositing.js";

describe("mapCompositing", () => {
  it("maps a standard blend mode directly at tier A", () => {
    const result = mapCompositing({ opacity: 0.8, blendMode: "MULTIPLY", isolation: false });
    expect(result.tier).toBe("A");
    expect(result.css).toEqual({ opacity: "0.8", mixBlendMode: "multiply" });
  });

  it("omits mix-blend-mode for NORMAL rather than emitting a no-op declaration", () => {
    const result = mapCompositing({ opacity: 1, blendMode: "NORMAL", isolation: false });
    expect(result.css?.mixBlendMode).toBeUndefined();
  });

  it("adds isolation:isolate when the group isolates blending", () => {
    const result = mapCompositing({ opacity: 1, blendMode: "SCREEN", isolation: true });
    expect(result.css?.isolation).toBe("isolate");
  });

  it("approximates PASS_THROUGH at tier B", () => {
    const result = mapCompositing({ opacity: 1, blendMode: "PASS_THROUGH", isolation: false });
    expect(result.tier).toBe("B");
    expect(result.unresolvedReason).toBeTruthy();
  });

  it("routes an unsupported blend mode to tier C with no CSS output", () => {
    const result = mapCompositing({ opacity: 1, blendMode: "LINEAR_BURN", isolation: false });
    expect(result.tier).toBe("C");
    expect(result.css).toBeUndefined();
  });
});
