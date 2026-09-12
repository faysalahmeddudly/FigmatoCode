import { describe, expect, it } from "vitest";
import { mapBlur } from "./map-blur.js";

describe("mapBlur", () => {
  it("maps object/layer blur to filter:blur() at tier B, with the approximation documented", () => {
    const result = mapBlur({ type: "OBJECT", radius: 10 });
    expect(result.tier).toBe("B");
    expect(result.css).toBe("blur(5px)");
    expect(result.unresolvedReason).toBeTruthy();
  });

  it("maps background blur to a backdrop-filter value at tier B", () => {
    const result = mapBlur({ type: "BACKGROUND", radius: 20 });
    expect(result.tier).toBe("B");
    expect(result.css).toBe("blur(10px)");
  });
});
