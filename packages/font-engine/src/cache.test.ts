import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cacheFontFace, fontFaceCss } from "./cache.js";
import type { ResolvedFontFace } from "./google-fonts.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "font-engine-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const face: ResolvedFontFace = {
  fontWeight: 700,
  fontStyle: "normal",
  unicodeRange: "U+0000-00FF",
  sha256: "abc123",
  bytes: new Uint8Array([1, 2, 3]),
};

describe("cacheFontFace", () => {
  it("writes the font bytes to a content-addressed path", () => {
    const path = cacheFontFace(face, dir);
    expect(path).toBe(join(dir, "abc123.woff2"));
    expect(readFileSync(path)).toEqual(Buffer.from([1, 2, 3]));
  });

  it("is idempotent when called twice for the same hash", () => {
    cacheFontFace(face, dir);
    expect(() => cacheFontFace(face, dir)).not.toThrow();
  });
});

describe("fontFaceCss", () => {
  it("produces a @font-face rule pointing at the given relative url", () => {
    const css = fontFaceCss("Inter", face, "fonts/abc123.woff2");
    expect(css).toContain('font-family: "Inter"');
    expect(css).toContain("font-weight: 700");
    expect(css).toContain('url("fonts/abc123.woff2") format("woff2")');
    expect(css).toContain("unicode-range: U+0000-00FF;");
  });
});
