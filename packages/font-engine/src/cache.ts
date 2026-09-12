import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedFontFace } from "./google-fonts.js";

// PRD §14.9: font caches are content-addressed and immutable.
export function cacheFontFace(face: ResolvedFontFace, cacheDir: string): string {
  mkdirSync(cacheDir, { recursive: true });
  const filePath = join(cacheDir, `${face.sha256}.woff2`);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, face.bytes);
  }
  return filePath;
}

export function fontFaceCss(
  fontFamily: string,
  face: ResolvedFontFace,
  relativeUrl: string,
): string {
  const lines = [
    "@font-face {",
    `  font-family: "${fontFamily}";`,
    `  font-style: ${face.fontStyle};`,
    `  font-weight: ${face.fontWeight};`,
  ];
  if (face.unicodeRange) lines.push(`  unicode-range: ${face.unicodeRange};`);
  lines.push(`  src: url("${relativeUrl}") format("woff2");`, "}");
  return lines.join("\n");
}
