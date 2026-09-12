import { join } from "node:path";
import { resolveGoogleFont } from "./google-fonts.js";
import { cacheFontFace, fontFaceCss } from "./cache.js";

export interface CachedFont {
  cssText: string;
  sha256s: string[];
}

// Ties together fetch (google-fonts.ts) + content-addressed cache (cache.ts) into the single
// call the renderer needs: given a requested family/weight/style, produce @font-face CSS
// text whose src already points at cached local files under `fontsDir`.
export async function resolveAndCacheFont(
  family: string,
  weight: number,
  style: "normal" | "italic",
  cacheDir: string,
  fontsDirName = "fonts",
): Promise<CachedFont> {
  const faces = await resolveGoogleFont(family, weight, style);
  const cssBlocks: string[] = [];
  const sha256s: string[] = [];

  for (const face of faces) {
    cacheFontFace(face, cacheDir);
    const relativeUrl = `${fontsDirName}/${face.sha256}.woff2`;
    cssBlocks.push(fontFaceCss(family, face, relativeUrl));
    sha256s.push(face.sha256);
  }

  return { cssText: cssBlocks.join("\n\n"), sha256s };
}

export function fontCacheFilePath(cacheDir: string, sha256: string): string {
  return join(cacheDir, `${sha256}.woff2`);
}
