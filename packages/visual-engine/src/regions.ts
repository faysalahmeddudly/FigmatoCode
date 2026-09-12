export interface DiffRegion {
  id: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  area: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

class UnionFind {
  private readonly parent: Int32Array;

  constructor(size: number) {
    this.parent = new Int32Array(size).fill(-1);
  }

  makeSet(i: number): void {
    if (this.parent[i] === -1) this.parent[i] = i;
  }

  find(i: number): number {
    while (this.parent[i] !== i) {
      const p = this.parent[i]!;
      this.parent[i] = this.parent[p]!;
      i = this.parent[i]!;
    }
    return i;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }

  isSet(i: number): boolean {
    return this.parent[i] !== -1;
  }
}

// PRD §15.2 step 5-6: merge nearby error pixels into diff regions, then compute region area,
// bounding box, and severity. "Nearby" is implemented as 8-connectivity (adjacent or
// diagonal mismatched pixels merge into one region) -- a documented v1 choice; a
// distance-based dilation merge (joining regions separated by a small gap) is a possible
// later refinement, not implemented here.
export function mergeDiffRegions(maskData: Buffer, width: number, height: number): DiffRegion[] {
  const isMismatch = (x: number, y: number): boolean => maskData[(y * width + x) * 4 + 3]! > 0;

  const uf = new UnionFind(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isMismatch(x, y)) continue;
      const i = y * width + x;
      uf.makeSet(i);
      if (x > 0 && isMismatch(x - 1, y)) {
        uf.makeSet(i - 1);
        uf.union(i, i - 1);
      }
      if (y > 0 && isMismatch(x, y - 1)) {
        uf.makeSet(i - width);
        uf.union(i, i - width);
      }
      if (x > 0 && y > 0 && isMismatch(x - 1, y - 1)) {
        uf.makeSet(i - width - 1);
        uf.union(i, i - width - 1);
      }
      if (x < width - 1 && y > 0 && isMismatch(x + 1, y - 1)) {
        uf.makeSet(i - width + 1);
        uf.union(i, i - width + 1);
      }
    }
  }

  const bounds = new Map<
    number,
    { minX: number; minY: number; maxX: number; maxY: number; area: number }
  >();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isMismatch(x, y)) continue;
      const root = uf.find(y * width + x);
      const b = bounds.get(root);
      if (!b) {
        bounds.set(root, { minX: x, minY: y, maxX: x, maxY: y, area: 1 });
      } else {
        b.minX = Math.min(b.minX, x);
        b.minY = Math.min(b.minY, y);
        b.maxX = Math.max(b.maxX, x);
        b.maxY = Math.max(b.maxY, y);
        b.area += 1;
      }
    }
  }

  const totalPixels = width * height;
  const regions: DiffRegion[] = [];
  let id = 0;
  for (const b of bounds.values()) {
    const areaRatio = b.area / totalPixels;
    const severity: DiffRegion["severity"] =
      areaRatio > 0.01 ? "HIGH" : areaRatio > 0.001 ? "MEDIUM" : "LOW";
    regions.push({
      id: id++,
      boundingBox: {
        x: b.minX,
        y: b.minY,
        width: b.maxX - b.minX + 1,
        height: b.maxY - b.minY + 1,
      },
      area: b.area,
      severity,
    });
  }

  return regions;
}
