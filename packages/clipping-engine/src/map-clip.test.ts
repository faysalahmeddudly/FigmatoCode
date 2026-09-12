import { describe, expect, it } from "vitest";
import { mapClip } from "./map-clip.js";

describe("mapClip", () => {
  it("maps RECT geometry to clip-path:inset() at tier A", () => {
    const result = mapClip({ type: "RECT", geometry: { top: 0, right: 4, bottom: 8, left: 4 } });
    expect(result.tier).toBe("A");
    expect(result.css).toBe("inset(0px 4px 8px 4px)");
  });

  it("adds a round radius for RADIUS clips when provided", () => {
    const result = mapClip({
      type: "RADIUS",
      geometry: { top: 0, right: 0, bottom: 0, left: 0, radius: 12 },
    });
    expect(result.css).toBe("inset(0px 0px 0px 0px round 12px)");
  });

  it("routes PATH clips to tier C with no fabricated CSS", () => {
    const result = mapClip({ type: "PATH", geometry: { d: "M0 0" } });
    expect(result.tier).toBe("C");
    expect(result.css).toBeUndefined();
  });

  it("routes malformed/missing geometry to tier C instead of guessing", () => {
    const result = mapClip({ type: "RECT" });
    expect(result.tier).toBe("C");
    expect(result.unresolvedReason).toBeTruthy();
  });
});
