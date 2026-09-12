import { describe, expect, it } from "vitest";
import { decodeAndValidate } from "./normalize.js";
import { computePixelDiff } from "./diff.js";
import { makePngWithRect, makeSolidPng } from "./test-helpers.js";

describe("computePixelDiff", () => {
  it("finds zero mismatches for identical images", () => {
    const a = makeSolidPng(10, 10, [10, 20, 30, 255]);
    const b = makeSolidPng(10, 10, [10, 20, 30, 255]);
    const { reference, candidate } = decodeAndValidate(a, b);

    const result = computePixelDiff(reference, candidate);
    expect(result.mismatchedPixels).toBe(0);
  });

  it("counts a clearly different colored region as mismatched", () => {
    const a = makeSolidPng(10, 10, [255, 255, 255, 255]);
    const b = makePngWithRect(
      10,
      10,
      [255, 255, 255, 255],
      { x: 2, y: 2, width: 3, height: 3 },
      [0, 0, 0, 255],
    );
    const { reference, candidate } = decodeAndValidate(a, b);

    const result = computePixelDiff(reference, candidate);
    expect(result.mismatchedPixels).toBe(9);
  });
});
