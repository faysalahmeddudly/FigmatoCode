import { describe, expect, it } from "vitest";
import { mapMask } from "./map-mask.js";

describe("mapMask", () => {
  it("always routes to tier C, since no mask-source rendering pipeline exists", () => {
    for (const type of ["ALPHA", "LUMINANCE", "PATH"] as const) {
      const result = mapMask({ type });
      expect(result.tier).toBe("C");
      expect(result.css).toBeUndefined();
      expect(result.unresolvedReason).toBeTruthy();
    }
  });
});
