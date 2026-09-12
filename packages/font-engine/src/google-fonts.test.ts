import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveGoogleFont } from "./google-fonts.js";
import { FontMissingError } from "./errors.js";

const SAMPLE_CSS = `
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/sample-latin.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153;
}
`;

describe("resolveGoogleFont", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads and hashes each referenced font file", async () => {
    const fontBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(SAMPLE_CSS, { status: 200 }))
      .mockResolvedValueOnce(new Response(fontBytes, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const faces = await resolveGoogleFont("Inter", 700, "normal");

    expect(faces).toHaveLength(1);
    expect(faces[0]?.fontWeight).toBe(700);
    expect(faces[0]?.fontStyle).toBe("normal");
    expect(faces[0]?.unicodeRange).toContain("U+0000-00FF");
    expect(faces[0]?.sha256).toHaveLength(64);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws FontMissingError when Google Fonts rejects the family", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveGoogleFont("NotARealFont", 400, "normal")).rejects.toBeInstanceOf(
      FontMissingError,
    );
  });

  it("throws FontMissingError when the response has no @font-face rules", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("body { color: red; }", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveGoogleFont("Inter", 400, "normal")).rejects.toBeInstanceOf(
      FontMissingError,
    );
  });
});
