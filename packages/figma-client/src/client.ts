import { FigmaClientError } from "./errors.js";
import type { FigmaNodesResponse, ImageExportResponse } from "./types.js";
import { PgCache } from "./cache.js";

export interface FigmaClientOptions {
  token: string;
  baseUrl?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  databaseUrl?: string;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// PRD §14.4: bounded retries with exponential backoff for rate limits/transient failures;
// permanent failures (auth, not-found) terminate immediately with a typed error, never retried.
export class FigmaClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;
  public readonly cache?: PgCache;

  constructor(options: FigmaClientOptions) {
    if (!options.token) {
      throw new FigmaClientError("AUTH_FAILED", "FIGMA_TOKEN is required but was empty");
    }
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://api.figma.com/v1";
    this.maxRetries = options.maxRetries ?? 3;
    this.initialBackoffMs = options.initialBackoffMs ?? 500;
    if (options.databaseUrl) {
      this.cache = new PgCache(options.databaseUrl);
    }
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNodesResponse> {
    const idsParam = encodeURIComponent(nodeIds.join(","));
    const path = `/files/${encodeURIComponent(fileKey)}/nodes?ids=${idsParam}`;
    return this.requestWithRetry<FigmaNodesResponse>(path);
  }

  // PRD §4.1 Reference Rendering Contract: the reference image is Figma's own rendered
  // pixels for the frame, not a re-derivation from geometry. This is how that image is
  // obtained -- scale=1 exports at the frame's native absoluteBoundingBox size, matching
  // the render viewport used for the candidate screenshot.
  async getImageUrls(
    fileKey: string,
    nodeIds: string[],
    options?: { scale?: number; format?: "png" | "jpg" | "svg" | "pdf" },
  ): Promise<ImageExportResponse> {
    const idsParam = encodeURIComponent(nodeIds.join(","));
    const scale = options?.scale ?? 1;
    const format = options?.format ?? "png";
    const path = `/images/${encodeURIComponent(fileKey)}?ids=${idsParam}&scale=${scale}&format=${format}`;
    return this.requestWithRetry<ImageExportResponse>(path);
  }

  // The URL returned by getImageUrls is a pre-signed S3 link, not a Figma API path -- no
  // token is sent, and it is fetched as-is rather than joined with baseUrl.
  async downloadImage(url: string): Promise<Uint8Array> {
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new FigmaClientError(
        "FIGMA_UNAVAILABLE",
        "Network request to download exported image failed",
      );
    }
    if (!response.ok) {
      throw new FigmaClientError(
        "FIGMA_UNAVAILABLE",
        `Image download returned ${response.status}`,
        response.status,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  private async requestWithRetry<T>(path: string): Promise<T> {
    if (this.cache) {
      const cached = await this.cache.get<T>(path);
      if (cached) return cached;
    }

    let lastError: FigmaClientError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.request<T>(path);
        if (this.cache) await this.cache.set(path, response);
        return response;
      } catch (error) {
        if (!(error instanceof FigmaClientError)) throw error;
        if (error.code !== "FIGMA_RATE_LIMIT" && error.code !== "FIGMA_UNAVAILABLE") {
          throw error;
        }
        lastError = error;
        if (attempt === this.maxRetries) break;
        const backoffMs = this.initialBackoffMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  private async request<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: { "X-Figma-Token": this.token },
      });
    } catch {
      throw new FigmaClientError("FIGMA_UNAVAILABLE", "Network request to Figma API failed");
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 401 || response.status === 403) {
      throw new FigmaClientError("AUTH_FAILED", "Figma API rejected the token", response.status);
    }
    if (response.status === 404) {
      throw new FigmaClientError(
        "NODE_NOT_FOUND",
        "Requested file or node was not found",
        response.status,
      );
    }
    if (response.status === 429) {
      throw new FigmaClientError(
        "FIGMA_RATE_LIMIT",
        "Figma API rate limit exceeded",
        response.status,
      );
    }
    if (RETRYABLE_STATUS.has(response.status)) {
      throw new FigmaClientError(
        "FIGMA_UNAVAILABLE",
        "Figma API returned a transient error",
        response.status,
      );
    }

    throw new FigmaClientError(
      "FIGMA_UNAVAILABLE",
      `Figma API returned unexpected status ${response.status}`,
      response.status,
    );
  }
}
