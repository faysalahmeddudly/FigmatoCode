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
});
