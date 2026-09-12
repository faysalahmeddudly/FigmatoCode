import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  computeCacheKey,
  FileSystemCandidateCache,
  InMemoryCandidateCache,
  type CacheKeyInput,
} from "./candidate-cache.js";

function keyInput(overrides: Partial<CacheKeyInput> = {}): CacheKeyInput {
  return {
    sourceHash: "s",
    frameHash: "f",
    designHash: "d",
    irHash: "i",
    viewport: "1280x800",
    dpr: 1,
    fontHash: "font",
    assetHash: "asset",
    generatorVersion: "1.0.0",
    ruleVersion: "1.0.0",
    scoringProfile: "default",
    candidatePatch: "gap:n0:16->8",
    environmentHash: "env",
    ...overrides,
  };
}

describe("computeCacheKey", () => {
  it("is deterministic for identical input", () => {
    expect(computeCacheKey(keyInput())).toBe(computeCacheKey(keyInput()));
  });

  it("changes when the candidate patch changes and nothing else does", () => {
    const a = computeCacheKey(keyInput());
    const b = computeCacheKey(keyInput({ candidatePatch: "gap:n0:16->4" }));
    expect(a).not.toBe(b);
  });

  it("changes when the environment hash changes, since a different Chromium/OS can render differently", () => {
    const a = computeCacheKey(keyInput());
    const b = computeCacheKey(keyInput({ environmentHash: "env2" }));
    expect(a).not.toBe(b);
  });
});

describe("InMemoryCandidateCache", () => {
  it("round-trips a value by key", () => {
    const cache = new InMemoryCandidateCache<{ score: number }>();
    const key = computeCacheKey(keyInput());
    expect(cache.get(key)).toBeUndefined();
    cache.set(key, { score: 96 });
    expect(cache.get(key)).toEqual({ score: 96 });
  });
});

describe("FileSystemCandidateCache", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("persists a value to a content-addressed file and reads it back", () => {
    dir = mkdtempSync(join(tmpdir(), "candidate-cache-"));
    const cache = new FileSystemCandidateCache<{ score: number }>(dir);
    const key = computeCacheKey(keyInput());

    expect(cache.get(key)).toBeUndefined();
    cache.set(key, { score: 96 });
    expect(cache.get(key)).toEqual({ score: 96 });
  });

  it("never rewrites an existing entry (immutable per §16.7)", () => {
    dir = mkdtempSync(join(tmpdir(), "candidate-cache-"));
    const cache = new FileSystemCandidateCache<{ score: number }>(dir);
    const key = computeCacheKey(keyInput());

    cache.set(key, { score: 96 });
    cache.set(key, { score: 1 });
    expect(cache.get(key)).toEqual({ score: 96 });
  });
});
