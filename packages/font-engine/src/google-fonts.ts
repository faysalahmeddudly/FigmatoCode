import { createHash } from "node:crypto";
import { FontMissingError } from "./errors.js";

export interface ResolvedFontFace {
  fontWeight: number;
  fontStyle: string;
  unicodeRange?: string;
  sha256: string;
  bytes: Uint8Array;
}

// Modern desktop-Chrome UA: Google Fonts sniffs the request to decide which container format
// to serve (woff2/woff/ttf); without a recognized modern UA it may fall back to older formats.
const MODERN_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FONT_FACE_BLOCK_RE = /@font-face\s*\{([^}]*)\}/g;
const FONT_STYLE_RE = /font-style:\s*(\w+)\s*;/;
const FONT_WEIGHT_RE = /font-weight:\s*(\d+)\s*;/;
const UNICODE_RANGE_RE = /unicode-range:\s*([^;]+);/;
const SRC_URL_RE = /src:\s*url\(([^)]+)\)\s*format\('woff2'\)/;

// PRD §14.9: Figma's REST API does not expose the design's actual font binaries (only usage
// metadata), so a real font file has to come from an authoritative source for the exact
// requested family/weight/style. Google Fonts' CSS2 endpoint is used as that source rather
// than falling back to a locally-installed or default browser font -- an unavailable font
// is a FONT_MISSING failure, never a silent substitution.
export async function resolveGoogleFont(
  family: string,
  weight: number,
  style: "normal" | "italic",
): Promise<ResolvedFontFace[]> {
  const ital = style === "italic" ? 1 : 0;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${ital},${weight}&display=swap`;

  let cssText: string;
  try {
    const response = await fetch(cssUrl, { headers: { "User-Agent": MODERN_CHROME_UA } });
    if (!response.ok) {
      throw new FontMissingError(family, weight, style, `Google Fonts returned ${response.status}`);
    }
    cssText = await response.text();
  } catch (error) {
    if (error instanceof FontMissingError) throw error;
    throw new FontMissingError(family, weight, style, "network request to Google Fonts failed");
  }

  const blocks = [...cssText.matchAll(FONT_FACE_BLOCK_RE)].map((m) => m[1] ?? "");
  if (blocks.length === 0) {
    throw new FontMissingError(
      family,
      weight,
      style,
      "no @font-face rules in Google Fonts response",
    );
  }

  const faces: ResolvedFontFace[] = [];
  for (const block of blocks) {
    const srcMatch = SRC_URL_RE.exec(block);
    if (!srcMatch?.[1]) continue;

    const fontRes = await fetch(srcMatch[1]);
    if (!fontRes.ok) {
      throw new FontMissingError(
        family,
        weight,
        style,
        `font file download failed (${fontRes.status})`,
      );
    }
    const bytes = new Uint8Array(await fontRes.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    faces.push({
      fontWeight: Number(FONT_WEIGHT_RE.exec(block)?.[1] ?? weight),
      fontStyle: FONT_STYLE_RE.exec(block)?.[1] ?? style,
      unicodeRange: UNICODE_RANGE_RE.exec(block)?.[1]?.trim(),
      sha256,
      bytes,
    });
  }

  if (faces.length === 0) {
    throw new FontMissingError(family, weight, style, "no woff2 src found in @font-face rules");
  }

  return faces;
}
