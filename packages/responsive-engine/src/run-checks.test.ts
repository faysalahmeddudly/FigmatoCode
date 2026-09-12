import { describe, expect, it } from "vitest";
import type { ViewportSnapshot } from "./types.js";
import { runResponsiveChecks } from "./run-checks.js";

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

describe("runResponsiveChecks", () => {
  it("aggregates failures across breakpoints and diffs wrap/displacement against the 1440 baseline", () => {
    const baseline = snapshot({
      breakpoint: 1440,
      viewportWidth: 1440,
      rects: {
        root: { x: 0, y: 0, width: 1440, height: 800 },
        text: { x: 0, y: 0, width: 400, height: 24 },
      },
      parentIds: { text: "root" },
    });
    const narrow = snapshot({
      breakpoint: 390,
      viewportWidth: 390,
      rects: {
        root: { x: 0, y: 0, width: 390, height: 800 },
        text: { x: 0, y: 0, width: 150, height: 60 },
      },
      parentIds: { text: "root" },
    });

    const failures = runResponsiveChecks([baseline, narrow]);
    expect(failures.some((f) => f.kind === "UNEXPECTED_WRAP")).toBe(true);
  });

  it("skips wrap/displacement diffing when no 1440 baseline is present, rather than guessing at a substitute", () => {
    const only390 = snapshot({
      breakpoint: 390,
      viewportWidth: 390,
      rects: { root: { x: 0, y: 0, width: 390, height: 800 } },
    });
    const failures = runResponsiveChecks([only390]);
    expect(failures.some((f) => f.kind === "UNEXPECTED_WRAP" || f.kind === "DISPLACEMENT")).toBe(
      false,
    );
  });
});
