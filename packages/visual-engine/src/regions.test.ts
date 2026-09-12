import { describe, expect, it } from "vitest";
import { mergeDiffRegions } from "./regions.js";

function buildMask(width: number, height: number, onPixels: Array<[number, number]>): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (const [x, y] of onPixels) {
    data[(y * width + x) * 4 + 3] = 255;
  }
  return data;
}

describe("mergeDiffRegions", () => {
  it("returns no regions for an empty mask", () => {
    const mask = buildMask(10, 10, []);
    expect(mergeDiffRegions(mask, 10, 10)).toEqual([]);
  });

  it("merges a solid 3x3 block into a single region with the correct bounding box", () => {
    const onPixels: Array<[number, number]> = [];
    for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) onPixels.push([x, y]);
    const mask = buildMask(10, 10, onPixels);

    const regions = mergeDiffRegions(mask, 10, 10);
    expect(regions).toHaveLength(1);
    expect(regions[0]?.boundingBox).toEqual({ x: 2, y: 2, width: 3, height: 3 });
    expect(regions[0]?.area).toBe(9);
  });

  it("merges diagonally-touching pixels into one region (8-connectivity)", () => {
    const mask = buildMask(10, 10, [
      [1, 1],
      [2, 2],
    ]);

    const regions = mergeDiffRegions(mask, 10, 10);
    expect(regions).toHaveLength(1);
    expect(regions[0]?.area).toBe(2);
  });

  it("keeps two separated blobs as distinct regions", () => {
    const mask = buildMask(10, 10, [
      [0, 0],
      [9, 9],
    ]);

    const regions = mergeDiffRegions(mask, 10, 10);
    expect(regions).toHaveLength(2);
  });

  it("classifies a large-area region as HIGH severity", () => {
    const onPixels: Array<[number, number]> = [];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) onPixels.push([x, y]);
    const mask = buildMask(10, 10, onPixels);

    const regions = mergeDiffRegions(mask, 10, 10);
    expect(regions[0]?.severity).toBe("HIGH");
  });
});
