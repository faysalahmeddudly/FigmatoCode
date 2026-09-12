import pixelmatch from "pixelmatch";
import type { DecodedImage } from "./normalize.js";

export interface PixelDiffResult {
  mismatchedPixels: number;
  totalPixels: number;
  // Alpha channel > 0 marks a mismatched pixel; RGB is undefined outside the mask. Produced
  // with diffMask so this is a clean per-pixel boolean signal, not a dimmed copy of the image.
  maskData: Buffer;
  width: number;
  height: number;
}

// PRD §15.2 steps 2-4: normalize (done by normalize.ts before this runs) -> per-pixel color
// error with an anti-alias tolerance -> binary error mask. pixelmatch's includeAA:false is
// exactly that anti-alias tolerance (it excludes differences explainable by anti-aliasing
// alone); `threshold` (0-1, YIQ color distance) is the configurable match sensitivity.
export function computePixelDiff(
  reference: DecodedImage,
  candidate: DecodedImage,
  threshold = 0.1,
): PixelDiffResult {
  const { width, height } = reference;
  const maskData = Buffer.alloc(width * height * 4);

  const mismatchedPixels = pixelmatch(reference.data, candidate.data, maskData, width, height, {
    threshold,
    includeAA: false,
    diffMask: true,
  });

  return { mismatchedPixels, totalPixels: width * height, maskData, width, height };
}
