import { describe, expect, it } from "vitest";
import { decodeAndValidate } from "./normalize.js";
import { ImageDimensionMismatchError } from "./errors.js";
import { makeSolidPng } from "./test-helpers.js";

describe("decodeAndValidate", () => {
  it("decodes matching-dimension images", () => {
    const ref = makeSolidPng(4, 4, [255, 0, 0, 255]);
    const cand = makeSolidPng(4, 4, [0, 255, 0, 255]);

    const { reference, candidate } = decodeAndValidate(ref, cand);
    expect(reference.width).toBe(4);
    expect(candidate.height).toBe(4);
  });

  it("throws ImageDimensionMismatchError instead of resizing", () => {
    const ref = makeSolidPng(4, 4, [255, 0, 0, 255]);
    const cand = makeSolidPng(8, 8, [255, 0, 0, 255]);

    expect(() => decodeAndValidate(ref, cand)).toThrow(ImageDimensionMismatchError);
  });
});
