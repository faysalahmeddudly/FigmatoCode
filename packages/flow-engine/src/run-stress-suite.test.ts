import { describe, expect, it } from "vitest";
import type { ViewportSnapshot } from "@figma-engine/responsive-engine";
import { runStressSuite } from "./run-stress-suite.js";

function snapshot(overrides: Partial<ViewportSnapshot>): ViewportSnapshot {
  return {
    breakpoint: 1440,
    viewportWidth: 1440,
    rootId: "root",
    rects: {},
    parentIds: {},
    ...overrides,
  };
}

describe("runStressSuite", () => {
  it("reports overflow caused by stress content pushing a node outside its container", () => {
    const results = [
      {
        tier: "EXTREME" as const,
        snapshot: snapshot({
          rects: {
            root: { x: 0, y: 0, width: 400, height: 200 },
            text: { x: 0, y: 0, width: 400, height: 600 },
          },
          parentIds: { text: "root" },
        }),
        contentByNode: {},
      },
    ];

    const failures = runStressSuite(results);
    expect(failures.overflow).toHaveLength(1);
    expect(failures.contentHiding).toHaveLength(0);
  });

  it("reports unevidenced content hiding across tiers", () => {
    const results = [
      {
        tier: "LONG" as const,
        snapshot: snapshot({ rects: { root: { x: 0, y: 0, width: 400, height: 200 } } }),
        contentByNode: {
          text: {
            injected: "a".repeat(300),
            renderedVisibleLength: 50,
            overflow: "hidden" as const,
            hasReferenceBackedTruncation: false,
          },
        },
      },
    ];

    const failures = runStressSuite(results);
    expect(failures.contentHiding).toHaveLength(1);
    expect(failures.contentHiding[0]?.tier).toBe("LONG");
  });
});
