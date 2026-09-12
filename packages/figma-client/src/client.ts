import { FigmaClientError } from "./errors.js";
import type { FigmaNodesResponse } from "./types.js";

export interface FigmaClientOptions {
  token: string;
  baseUrl?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// PRD §14.4: bounded retries with exponential backoff for rate limits/transient failures;
// permanent failures (auth, not-found) terminate immediately with a typed error, never retried.
export class FigmaClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;

  constructor(options: FigmaClientOptions) {
    if (!options.token) {
      throw new FigmaClientError("AUTH_FAILED", "FIGMA_TOKEN is required but was empty");
    }
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://api.figma.com/v1";
    this.maxRetries = options.maxRetries ?? 3;
    this.initialBackoffMs = options.initialBackoffMs ?? 500;
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNodesResponse> {
    const idsParam = encodeURIComponent(nodeIds.join(","));
    const path = `/files/${encodeURIComponent(fileKey)}/nodes?ids=${idsParam}`;
    return this.requestWithRetry<FigmaNodesResponse>(path);
  }

  private async requestWithRetry<T>(path: string): Promise<T> {
    let lastError: FigmaClientError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.request<T>(path);
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
