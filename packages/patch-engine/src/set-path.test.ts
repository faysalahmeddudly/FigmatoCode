import { describe, expect, it } from "vitest";
import { getAtPath, setAtPath } from "./set-path.js";

describe("getAtPath / setAtPath", () => {
  it("gets a nested value", () => {
    expect(getAtPath({ a: { b: { c: 5 } } }, ["a", "b", "c"])).toBe(5);
  });

  it("returns undefined for a missing path", () => {
    expect(getAtPath({ a: {} }, ["a", "b", "c"])).toBeUndefined();
  });

  it("sets a nested value in place", () => {
    const obj = { layout: { padding: { top: 0 } } };
    setAtPath(obj, ["layout", "padding", "top"], 16);
    expect(obj.layout.padding.top).toBe(16);
  });

  it("creates intermediate objects when they don't exist", () => {
    const obj: Record<string, unknown> = {};
    setAtPath(obj, ["layout", "gap"], 8);
    expect(obj).toEqual({ layout: { gap: 8 } });
  });
});
