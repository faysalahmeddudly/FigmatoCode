import { describe, expect, it } from "vitest";
import { mapShadow, mapShadows } from "./map-shadow.js";

const color = { r: 0, g: 0, b: 0, a: 0.25 };

describe("mapShadow", () => {
  it("maps a drop shadow to box-shadow with tier A", () => {
    const result = mapShadow({ type: "DROP", color, offsetX: 0, offsetY: 4, blur: 8, spread: 0 });
    expect(result.tier).toBe("A");
    expect(result.css).toBe("0px 4px 8px 0px rgba(0, 0, 0, 0.25)");
  });

  it("appends inset for an inner shadow", () => {
    const result = mapShadow({ type: "INNER", color, offsetX: 1, offsetY: 1, blur: 2 });
    expect(result.css).toBe("1px 1px 2px 0px rgba(0, 0, 0, 0.25) inset");
  });
});

describe("mapShadows", () => {
  it("joins multiple shadows with a comma", () => {
    const result = mapShadows([
      { type: "DROP", color, offsetX: 0, offsetY: 1, blur: 2 },
      { type: "DROP", color, offsetX: 0, offsetY: 4, blur: 8 },
    ]);
    expect(result?.css).toBe(
      "0px 1px 2px 0px rgba(0, 0, 0, 0.25), 0px 4px 8px 0px rgba(0, 0, 0, 0.25)",
    );
  });

  it("returns undefined for an empty list", () => {
    expect(mapShadows([])).toBeUndefined();
  });
});
