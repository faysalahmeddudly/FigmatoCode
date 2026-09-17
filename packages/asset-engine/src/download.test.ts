import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { downloadAsset, resolveAssetReference, resolveAllAssets } from "./download.js";
import { AssetEngineError } from "./errors.js";

// Use a real temp dir so we exercise actual filesystem writes.
let cacheDir: string;

beforeEach(async () => {
  cacheDir = join(tmpdir(), `asset-engine-test-${Date.now()}`);
  await mkdir(cacheDir, { recursive: true });
});

afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true });
});

// Minimal PNG (1×1 pixel, valid PNG header) used as fake asset bytes.
// Buffer.from(..., "hex") may share a pool ArrayBuffer — slice it to get an
// isolated ArrayBuffer whose byteLength equals the PNG's actual byte count.
const FAKE_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
    "0000000a49444154789c6260000000020001e221bc33000000000049454e44ae426082",
  "hex",
);
function fakePngArrayBuffer() {
  return FAKE_PNG.buffer.slice(FAKE_PNG.byteOffset, FAKE_PNG.byteOffset + FAKE_PNG.byteLength);
}

describe("downloadAsset", () => {
  it("writes file to cache dir keyed by sha256 and returns correct metadata", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => fakePngArrayBuffer(),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await downloadAsset("https://cdn.figma.com/fake.png", cacheDir);

    expect(result.sha256).toHaveLength(64); // valid hex SHA-256
    expect(result.byteLength).toBe(FAKE_PNG.byteLength);
    expect(result.localPath).toContain(result.sha256);

    // File must exist on disk
    const { readFile } = await import("node:fs/promises");
    const written = await readFile(result.localPath);
    expect(written).toEqual(FAKE_PNG);

    vi.unstubAllGlobals();
  });

  it("throws ASSET_MISSING on non-200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(downloadAsset("https://cdn.figma.com/forbidden.png", cacheDir)).rejects.toSatisfy(
      (e: unknown) => e instanceof AssetEngineError && e.code === "ASSET_MISSING",
    );

    vi.unstubAllGlobals();
  });

  it("throws ASSET_MISSING when fetch itself throws (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(downloadAsset("https://cdn.figma.com/broken.png", cacheDir)).rejects.toSatisfy(
      (e: unknown) => e instanceof AssetEngineError && e.code === "ASSET_MISSING",
    );

    vi.unstubAllGlobals();
  });

  it("throws ASSET_CORRUPT when downloaded bytes don't match expectedSha256", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => fakePngArrayBuffer(),
    }));

    await expect(
      downloadAsset("https://cdn.figma.com/fake.png", cacheDir, "0".repeat(64)),
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof AssetEngineError && e.code === "ASSET_CORRUPT",
    );

    vi.unstubAllGlobals();
  });

  it("returns cached file without fetching when sha256 already on disk", async () => {
    // Pre-seed the cache
    const { writeFile } = await import("node:fs/promises");
    const fakeSha = "a".repeat(64);
    const cachedPath = join(cacheDir, `${fakeSha}.png`);
    await writeFile(cachedPath, FAKE_PNG);

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await downloadAsset("https://cdn.figma.com/any.png", cacheDir, fakeSha);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.sha256).toBe(fakeSha);
    expect(result.localPath).toBe(cachedPath);

    vi.unstubAllGlobals();
  });
});

describe("resolveAssetReference", () => {
  it("returns an AssetReference with correct sourceId and sha256", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => fakePngArrayBuffer(),
    }));

    const ref = await resolveAssetReference("fig-image-123", "https://cdn.figma.com/img.png", cacheDir);

    expect(ref.sourceId).toBe("fig-image-123");
    expect(ref.sha256).toHaveLength(64);
    expect(ref.path).toContain(ref.sha256);

    vi.unstubAllGlobals();
  });
});

describe("resolveAllAssets", () => {
  it("collects failures without throwing — partial success is valid", async () => {
    // Use mockImplementation keyed by URL so Promise.all order doesn't matter.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("ok.png")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: { get: () => "image/png" },
            arrayBuffer: async () => fakePngArrayBuffer(),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      }),
    );

    const assets = new Map([
      ["id-ok", "https://cdn.figma.com/ok.png"],
      ["id-fail", "https://cdn.figma.com/missing.png"],
    ]);

    const result = await resolveAllAssets(assets, cacheDir);

    expect(result.resolved.size).toBe(1);
    expect(result.resolved.has("id-ok")).toBe(true);
    expect(result.failed.size).toBe(1);
    expect(result.failed.has("id-fail")).toBe(true);

    vi.unstubAllGlobals();
  });
});
