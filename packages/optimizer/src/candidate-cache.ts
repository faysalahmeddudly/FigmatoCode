import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// PRD §16.7 cache-key contract. Every input that can change what a render/score for a
// candidate produces is part of the key, in this fixed field order, so two independently
// computed keys for "the same" candidate never diverge over object-property ordering.
export interface CacheKeyInput {
  sourceHash: string;
  frameHash: string;
  designHash: string;
  irHash: string;
  viewport: string;
  dpr: number;
  fontHash: string;
  assetHash: string;
  generatorVersion: string;
  ruleVersion: string;
  scoringProfile: string;
  candidatePatch: string;
  environmentHash: string;
}

const KEY_ORDER: (keyof CacheKeyInput)[] = [
  "sourceHash",
  "frameHash",
  "designHash",
  "irHash",
  "viewport",
  "dpr",
  "fontHash",
  "assetHash",
  "generatorVersion",
  "ruleVersion",
  "scoringProfile",
  "candidatePatch",
  "environmentHash",
];

export function computeCacheKey(input: CacheKeyInput): string {
  const canonical = KEY_ORDER.map((k) => `${k}=${input[k]}`).join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export interface CandidateCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

// For a single process run (tests, short-lived scripts) where filesystem persistence across
// runs isn't needed.
export class InMemoryCandidateCache<T> implements CandidateCache<T> {
  private readonly store = new Map<string, T>();

  get(key: string): T | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T): void {
    this.store.set(key, value);
  }
}

// PRD §16.7 "Filesystem-based (content-addressed)", mirroring font-engine's cache.ts
// convention: one immutable JSON file per key, written once and never rewritten.
export class FileSystemCandidateCache<T> implements CandidateCache<T> {
  constructor(private readonly cacheDir: string) {}

  get(key: string): T | undefined {
    const filePath = join(this.cacheDir, `${key}.json`);
    if (!existsSync(filePath)) return undefined;
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  }

  set(key: string, value: T): void {
    mkdirSync(this.cacheDir, { recursive: true });
    const filePath = join(this.cacheDir, `${key}.json`);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(value));
    }
  }
}
