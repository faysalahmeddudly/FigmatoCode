import { PNG } from "pngjs";
import { ImageDimensionMismatchError } from "./errors.js";

export interface DecodedImage {
  width: number;
  height: number;
  data: Buffer;
}

// PRD §15.1: reference and candidate must be normalized to identical pixel dimensions before
// comparison; alpha/background treatment comes from the reference artifact, never inferred.
// For M3, normalization means validating the images already match (both were produced at
// the same viewport/DPR) rather than resizing -- a resize would distort the very geometry
// the comparison is meant to measure.
export function decodeAndValidate(
  referencePng: Buffer,
  candidatePng: Buffer,
): { reference: DecodedImage; candidate: DecodedImage } {
  const reference = PNG.sync.read(referencePng);
  const candidate = PNG.sync.read(candidatePng);

  if (reference.width !== candidate.width || reference.height !== candidate.height) {
    throw new ImageDimensionMismatchError(reference, candidate);
  }

  return {
    reference: { width: reference.width, height: reference.height, data: reference.data },
    candidate: { width: candidate.width, height: candidate.height, data: candidate.data },
  };
}
