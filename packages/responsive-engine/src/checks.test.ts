import { describe, expect, it } from "vitest";
import type { ViewportSnapshot } from "./types.js";
import {
  checkAspectRatio,
  checkCollision,
  checkContainerInstability,
  checkDisplacement,
  checkHorizontalScroll,
  checkOverflow,
  checkUnexpectedWrap,
} from "./checks.js";

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

describe("checkOverflow", () => {
  it("flags a child that extends past its parent's bounds", () => {
    const s = snapshot({
      rects: {
        root: { x: 0, y: 0, width: 100, height: 100 },
        child: { x: 0, y: 0, width: 120, height: 50 },
      },
      parentIds: { child: "root" },
    });
    const failures = checkOverflow(s);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.kind).toBe("OVERFLOW");
  });

  it("allows overflow inside a designated scroll container", () => {
    const s = snapshot({
      rects: {
        root: { x: 0, y: 0, width: 100, height: 100 },
        child: { x: 0, y: 0, width: 120, height: 50 },
      },
      parentIds: { child: "root" },
    });
    expect(checkOverflow(s, (id) => id === "root")).toHaveLength(0);
  });

  it("passes a fully-contained child", () => {
    const s = snapshot({
      rects: {
        root: { x: 0, y: 0, width: 100, height: 100 },
        child: { x: 10, y: 10, width: 50, height: 50 },
      },
      parentIds: { child: "root" },
    });
    expect(checkOverflow(s)).toHaveLength(0);
  });
});

describe("checkHorizontalScroll", () => {
  it("flags a root wider than the viewport", () => {
    const s = snapshot({ rects: { root: { x: 0, y: 0, width: 1500, height: 800 } } });
    expect(checkHorizontalScroll(s)).toHaveLength(1);
  });

  it("passes a root that fits the viewport", () => {
    const s = snapshot({ rects: { root: { x: 0, y: 0, width: 1440, height: 800 } } });
    expect(checkHorizontalScroll(s)).toHaveLength(0);
  });
});

describe("checkCollision", () => {
  it("flags overlapping siblings", () => {
    const s = snapshot({
      rects: {
        a: { x: 0, y: 0, width: 50, height: 50 },
        b: { x: 20, y: 20, width: 50, height: 50 },
      },
      parentIds: { a: "root", b: "root" },
    });
    expect(checkCollision(s)).toHaveLength(1);
  });

  it("respects an explicit overlap allowance", () => {
    const s = snapshot({
      rects: {
        a: { x: 0, y: 0, width: 50, height: 50 },
        b: { x: 20, y: 20, width: 50, height: 50 },
      },
      parentIds: { a: "root", b: "root" },
    });
    expect(checkCollision(s, () => true)).toHaveLength(0);
  });

  it("ignores non-overlapping siblings", () => {
    const s = snapshot({
      rects: {
        a: { x: 0, y: 0, width: 50, height: 50 },
        b: { x: 100, y: 0, width: 50, height: 50 },
      },
      parentIds: { a: "root", b: "root" },
    });
    expect(checkCollision(s)).toHaveLength(0);
  });
});

describe("checkUnexpectedWrap", () => {
  it("flags a node that grew taller and narrower relative to baseline", () => {
    const baseline = snapshot({
      breakpoint: 1440,
      rects: { text: { x: 0, y: 0, width: 400, height: 24 } },
    });
    const narrow = snapshot({
      breakpoint: 390,
      rects: { text: { x: 0, y: 0, width: 200, height: 48 } },
    });
    expect(checkUnexpectedWrap(narrow, baseline)).toHaveLength(1);
  });

  it("does not flag a node that simply widened", () => {
    const baseline = snapshot({ rects: { text: { x: 0, y: 0, width: 400, height: 24 } } });
    const wider = snapshot({
      breakpoint: 1280,
      rects: { text: { x: 0, y: 0, width: 500, height: 24 } },
    });
    expect(checkUnexpectedWrap(wider, baseline)).toHaveLength(0);
  });
});

describe("checkDisplacement", () => {
  it("flags a node whose relative position shifts beyond tolerance", () => {
    const baseline = snapshot({
      rects: {
        root: { x: 0, y: 0, width: 1000, height: 500 },
        child: { x: 100, y: 0, width: 50, height: 50 },
      },
      parentIds: { child: "root" },
    });
    const shifted = snapshot({
      breakpoint: 390,
      rects: {
        root: { x: 0, y: 0, width: 1000, height: 500 },
        child: { x: 700, y: 0, width: 50, height: 50 },
      },
      parentIds: { child: "root" },
    });
    expect(checkDisplacement(shifted, baseline)).toHaveLength(1);
  });

  it("tolerates a small relative shift", () => {
    const baseline = snapshot({
      rects: {
        root: { x: 0, y: 0, width: 1000, height: 500 },
        child: { x: 100, y: 0, width: 50, height: 50 },
      },
      parentIds: { child: "root" },
    });
    const slight = snapshot({
      breakpoint: 1280,
      rects: {
        root: { x: 0, y: 0, width: 1000, height: 500 },
        child: { x: 130, y: 0, width: 50, height: 50 },
      },
      parentIds: { child: "root" },
    });
    expect(checkDisplacement(slight, baseline)).toHaveLength(0);
  });
});

describe("checkContainerInstability", () => {
  it("flags a width that reverses direction across ascending breakpoints", () => {
    const snapshots = [
      snapshot({
        breakpoint: 390,
        viewportWidth: 390,
        rects: { c: { x: 0, y: 0, width: 300, height: 10 } },
      }),
      snapshot({
        breakpoint: 768,
        viewportWidth: 768,
        rects: { c: { x: 0, y: 0, width: 500, height: 10 } },
      }),
      snapshot({
        breakpoint: 1280,
        viewportWidth: 1280,
        rects: { c: { x: 0, y: 0, width: 400, height: 10 } },
      }),
    ];
    expect(checkContainerInstability(snapshots)).toHaveLength(1);
  });

  it("passes a monotonically growing container", () => {
    const snapshots = [
      snapshot({
        breakpoint: 390,
        viewportWidth: 390,
        rects: { c: { x: 0, y: 0, width: 300, height: 10 } },
      }),
      snapshot({
        breakpoint: 768,
        viewportWidth: 768,
        rects: { c: { x: 0, y: 0, width: 500, height: 10 } },
      }),
      snapshot({
        breakpoint: 1280,
        viewportWidth: 1280,
        rects: { c: { x: 0, y: 0, width: 700, height: 10 } },
      }),
    ];
    expect(checkContainerInstability(snapshots)).toHaveLength(0);
  });
});

describe("checkAspectRatio", () => {
  it("flags a node that deviates from its required aspect ratio", () => {
    const s = snapshot({ rects: { img: { x: 0, y: 0, width: 100, height: 100 } } });
    expect(checkAspectRatio(s, { img: 2 })).toHaveLength(1);
  });

  it("passes a node that keeps its required aspect ratio", () => {
    const s = snapshot({ rects: { img: { x: 0, y: 0, width: 200, height: 100 } } });
    expect(checkAspectRatio(s, { img: 2 })).toHaveLength(0);
  });
});
