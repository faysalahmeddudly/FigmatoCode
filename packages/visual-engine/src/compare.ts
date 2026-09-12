import { PNG } from "pngjs";
import type { DesignDocument } from "@figma-engine/shared-contracts";
import { decodeAndValidate } from "./normalize.js";
import { computePixelDiff } from "./diff.js";
import { mergeDiffRegions, type DiffRegion } from "./regions.js";
import { findOwningNodeId } from "./ownership.js";
import { computePerceptualSimilarity } from "./perceptual.js";

export interface OwnedDiffRegion extends DiffRegion {
  ownerNodeId?: string;
}

export interface VisualComparisonResult {
  width: number;
  height: number;
  mismatchedPixels: number;
  totalPixels: number;
  perceptualSimilarity: number;
  regions: OwnedDiffRegion[];
  diffImagePng: Buffer;
}

// PRD §15.2 full pipeline, and §25.0A's boundary: visual-engine does image comparison and
// diff regions, and must never generate CSS -- geometry/layout fixes are root-cause-engine's
// job downstream of this result, not this package's.
export function compareImages(
  referencePng: Buffer,
  candidatePng: Buffer,
  doc: DesignDocument,
  threshold = 0.1,
): VisualComparisonResult {
  const { reference, candidate } = decodeAndValidate(referencePng, candidatePng);
  const { mismatchedPixels, totalPixels, maskData, width, height } = computePixelDiff(
    reference,
    candidate,
    threshold,
  );

  const regions: OwnedDiffRegion[] = mergeDiffRegions(maskData, width, height).map((region) => ({
    ...region,
    ownerNodeId: findOwningNodeId(region, doc),
  }));

  const diffPng = new PNG({ width, height });
  maskData.copy(diffPng.data);

  return {
    width,
    height,
    mismatchedPixels,
    totalPixels,
    perceptualSimilarity: computePerceptualSimilarity(mismatchedPixels, totalPixels),
    regions,
    diffImagePng: PNG.sync.write(diffPng),
  };
}
