import { afterEach, describe, expect, it, vi } from "vitest";
import { FigmaClient } from "./client.js";
import { FigmaClientError } from "./errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("FigmaClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires a token", () => {
    expect(() => new FigmaClient({ token: "" })).toThrow(FigmaClientError);
  });

  it("returns parsed JSON on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ name: "f", lastModified: "", version: "1", nodes: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t" });
    const result = await client.getFileNodes("file1", ["1:1"]);

    expect(result.name).toBe("f");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps 401 to AUTH_FAILED without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t", maxRetries: 3 });
    await expect(client.getFileNodes("file1", ["1:1"])).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps 404 to NODE_NOT_FOUND without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t" });
    await expect(client.getFileNodes("file1", ["1:1"])).rejects.toMatchObject({
      code: "NODE_NOT_FOUND",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 with bounded attempts then throws FIGMA_RATE_LIMIT", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t", maxRetries: 2, initialBackoffMs: 1 });
    await expect(client.getFileNodes("file1", ["1:1"])).rejects.toMatchObject({
      code: "FIGMA_RATE_LIMIT",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("succeeds after a transient 503 retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        jsonResponse({ name: "f", lastModified: "", version: "1", nodes: {} }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t", maxRetries: 2, initialBackoffMs: 1 });
    const result = await client.getFileNodes("file1", ["1:1"]);

    expect(result.name).toBe("f");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("getImageUrls requests scale/format and returns the image URL map", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ err: null, images: { "1:1": "https://s3/x.png" } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t" });
    const result = await client.getImageUrls("file1", ["1:1"], { scale: 2, format: "png" });

    expect(result.images["1:1"]).toBe("https://s3/x.png");
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toContain("/images/file1");
    expect(calledUrl).toContain("scale=2");
    expect(calledUrl).toContain("format=png");
  });

  it("downloadImage fetches raw bytes without the Figma token header", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(bytes, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t" });
    const result = await client.downloadImage("https://s3/x.png");

    expect(result).toEqual(bytes);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(calledUrl).toBe("https://s3/x.png");
    expect(calledInit).toBeUndefined();
  });

  it("downloadImage maps a failed download to FIGMA_UNAVAILABLE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FigmaClient({ token: "t" });
    await expect(client.downloadImage("https://s3/x.png")).rejects.toMatchObject({
      code: "FIGMA_UNAVAILABLE",
    });
  });
});
