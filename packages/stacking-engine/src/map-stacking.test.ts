import { describe, expect, it } from "vitest";
import { mapStacking } from "./map-stacking.js";

describe("mapStacking", () => {
  it("maps position and numeric z-index directly at tier A", () => {
    const result = mapStacking({
      position: "absolute",
      zIndex: 3,
      stackingContext: false,
      paintOrder: 0,
    });
    expect(result.tier).toBe("A");
    expect(result.css).toEqual({ position: "absolute", zIndex: "3" });
  });

  it("omits z-index for auto rather than emitting a no-op declaration", () => {
    const result = mapStacking({
      position: "relative",
      zIndex: "auto",
      stackingContext: false,
      paintOrder: 0,
    });
    expect(result.css?.zIndex).toBeUndefined();
  });

  it("adds isolation:isolate for a stacking context", () => {
    const result = mapStacking({
      position: "relative",
      zIndex: "auto",
      stackingContext: true,
      paintOrder: 0,
    });
    expect(result.css?.isolation).toBe("isolate");
  });
});
