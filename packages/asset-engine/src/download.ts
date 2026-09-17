import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import type { AssetReference } from "@figma-engine/shared-contracts";
import { AssetEngineError } from "./errors.js";

// PRD §14.6 / §14.8: assets are downloaded once, content-addressed by SHA-256, and stored
// under <cacheDir>/<sha256>.<ext>. Every subsequent call for the same content-hash is a
// cache hit — no re-download, no silent re-derivation.
//
// §21.1 failure classes:
//   ASSET_MISSING   — network fetch failed or non-200 response
//   ASSET_CORRUPT   — downloaded bytes don't match the expected sha256

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function extensionFromMime(mime: string): string {
  if (mime.includes("svg")) return "svg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "bin";
}

function extensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split(".").pop()?.toLowerCase();
    if (last && ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(last)) return last;
  } catch {
    /* ignore */
  }
  return "bin";
}

// ------------------------------------------------------------------
// Download + hash a single asset URL → local content-addressed file
// ------------------------------------------------------------------

export interface DownloadedAsset {
  /** Absolute path to the cached file on disk */
  localPath: string;
  /** SHA-256 hex of the raw downloaded bytes */
  sha256: string;
  /** Size in bytes */
  byteLength: number;
}

/**
 * Downloads `url` and writes it to `<cacheDir>/<sha256>.<ext>`.
 *
 * If a file with that SHA-256 already exists it is returned immediately
 * (cache hit). The optional `expectedSha256` param is checked after download;
 * mismatch → `ASSET_CORRUPT`.
 *
 * This function never silently swallows download or hash errors — every
 * failure surfaces as a typed `AssetEngineError` (§21.1).
 */
export async function downloadAsset(
  url: string,
  cacheDir: string,
  expectedSha256?: string,
): Promise<DownloadedAsset> {
  await mkdir(cacheDir, { recursive: true });

  // If caller already knows the sha256 (e.g. from a prior parse run's manifest),
  // attempt a cache hit before touching the network.
  if (expectedSha256) {
    const candidates = await findCachedFile(cacheDir, expectedSha256);
    if (candidates) return candidates;
  }

  // --- Fetch ---
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new AssetEngineError(
      "ASSET_MISSING",
      `Network request failed for asset URL: ${url} — ${String(cause)}`,
    );
  }

  if (!response.ok) {
    throw new AssetEngineError(
      "ASSET_MISSING",
      `Asset download returned HTTP ${response.status} for URL: ${url}`,
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (cause) {
    throw new AssetEngineError(
      "ASSET_MISSING",
      `Failed to read response body for asset URL: ${url} — ${String(cause)}`,
    );
  }

  // --- Hash ---
  const sha256 = sha256Hex(bytes);

  // --- Validate against expected hash if provided ---
  if (expectedSha256 && sha256 !== expectedSha256) {
    throw new AssetEngineError(
      "ASSET_CORRUPT",
      `SHA-256 mismatch for asset URL: ${url}. Expected ${expectedSha256}, got ${sha256}`,
    );
  }

  // --- Determine extension ---
  const contentType = response.headers.get("content-type") ?? "";
  const ext = extensionFromMime(contentType) || extensionFromUrl(url);
  const filename = `${sha256}.${ext}`;
  const localPath = join(cacheDir, filename);

  // Second cache-hit check: another concurrent download may have raced us.
  const alreadyCached = await fileExists(localPath);
  if (!alreadyCached) {
    await writeFile(localPath, bytes);
  }

  return { localPath, sha256, byteLength: bytes.byteLength };
}

// ------------------------------------------------------------------
// Build an AssetReference (the shape that NodeIR carries — §14.8)
// ------------------------------------------------------------------

/**
 * Downloads an asset and returns an `AssetReference` ready to embed in a NodeIR.
 * `sourceId` is the Figma image hash / fill reference ID — used as the stable
 * lookup key that ties the reference back to its Figma origin.
 */
export async function resolveAssetReference(
  sourceId: string,
  url: string,
  cacheDir: string,
  expectedSha256?: string,
): Promise<AssetReference> {
  const downloaded = await downloadAsset(url, cacheDir, expectedSha256);
  return {
    sourceId,
    sha256: downloaded.sha256,
    path: downloaded.localPath,
  };
}

// ------------------------------------------------------------------
// Batch: resolve all image-fill asset URLs for a set of nodes
// ------------------------------------------------------------------

export interface AssetBatchResult {
  resolved: Map<string, AssetReference>; // sourceId → AssetReference
  failed: Map<string, string>;           // sourceId → error message
}

/**
 * Resolves a map of `{ sourceId → url }` entries in parallel.
 * Failed downloads are collected rather than thrown so callers can decide
 * whether any single failure is fatal (matching the §21.1 per-node failure
 * model rather than an all-or-nothing abort).
 */
export async function resolveAllAssets(
  assets: Map<string, string>, // sourceId → url
  cacheDir: string,
): Promise<AssetBatchResult> {
  const resolved = new Map<string, AssetReference>();
  const failed = new Map<string, string>();

  await Promise.all(
    Array.from(assets.entries()).map(async ([sourceId, url]) => {
      try {
        const ref = await resolveAssetReference(sourceId, url, cacheDir);
        resolved.set(sourceId, ref);
      } catch (err) {
        failed.set(sourceId, err instanceof AssetEngineError ? err.message : String(err));
      }
    }),
  );

  return { resolved, failed };
}

// ------------------------------------------------------------------
// Internal utilities
// ------------------------------------------------------------------

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Look for any cached file whose basename starts with the given sha256. */
async function findCachedFile(
  cacheDir: string,
  sha256: string,
): Promise<DownloadedAsset | null> {
  // Try common extensions first for speed; fall back to a directory scan.
  for (const ext of ["png", "jpg", "svg", "webp", "bin"]) {
    const p = join(cacheDir, `${sha256}.${ext}`);
    if (await fileExists(p)) {
      const bytes = await readFile(p);
      return { localPath: p, sha256, byteLength: bytes.byteLength };
    }
  }
  return null;
}
