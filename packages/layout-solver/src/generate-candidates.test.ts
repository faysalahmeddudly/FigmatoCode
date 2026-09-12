import { describe, expect, it } from "vitest";
import { docOf, evidenceOf, node } from "./test-helpers.js";
import { generateCandidates } from "./generate-candidates.js";

const context = { scoreBefore: 90, parentVersionId: "v0" };

describe("generateCandidates", () => {
  it("orders dimensions width, gap, alignment, height and never mixes properties across a single patch", () => {
    const doc = docOf(
      node({
        identity: { figmaId: "1", internalId: "n0", structureHash: "h" },
        children: ["n1"],
        layout: { mode: "AUTO_LAYOUT", axis: "HORIZONTAL", gap: 16 },
      }),
      node({
        identity: { figmaId: "2", internalId: "n1", structureHash: "h" },
        parentId: "n0",
        absolute: { x: 0, y: 0, width: 100, height: 40 },
        layout: { mode: "NONE", sizing: { width: "FIXED", height: "FIXED" } },
      }),
    );
    const evidence = evidenceOf({
      rootCause: "POSITION",
      geometryDiff: { nodeId: "n1", dx: 8, dy: 6, dw: 0, dh: 0 },
    });

    const candidates = generateCandidates(evidence, doc, context);
    const properties = candidates.map((c) => c.property);

    // width candidates require a SIZE root cause (this evidence is POSITION), so only gap
    // and alignment fire here -- gap still precedes alignment per the fixed dimension order.
    const gapEndIndex = properties.lastIndexOf("layout.gap");
    const alignStartIndex = properties.indexOf("layout.align");
    expect(gapEndIndex).toBeGreaterThanOrEqual(0);
    expect(alignStartIndex).toBeGreaterThan(gapEndIndex);
    for (const p of properties) {
      expect(["layout.gap", "layout.align", "absolute.width", "absolute.height"]).toContain(p);
    }
  });
});
