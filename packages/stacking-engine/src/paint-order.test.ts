import { describe, expect, it } from "vitest";
import { compareStackingOrder } from "./paint-order.js";

function stacking(zIndex: number | "auto", paintOrder: number) {
  return { position: "absolute" as const, zIndex, stackingContext: false, paintOrder };
}

describe("compareStackingOrder", () => {
  it("orders by zIndex first", () => {
    expect(compareStackingOrder(stacking(1, 5), stacking(2, 0))).toBeLessThan(0);
  });

  it("falls back to paintOrder when zIndex ties", () => {
    expect(compareStackingOrder(stacking(1, 5), stacking(1, 2))).toBeGreaterThan(0);
  });

  it("treats auto as z-index 0", () => {
    expect(compareStackingOrder(stacking("auto", 0), stacking(1, 0))).toBeLessThan(0);
  });
});
