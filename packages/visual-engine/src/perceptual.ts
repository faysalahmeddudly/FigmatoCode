// PRD §15.2 step 7: "a perceptual similarity score for large-area structural differences."
// v1 here is deliberately simple (1 - mismatch ratio) rather than true SSIM/perceptual
// hashing -- the roadmap flags revisiting with a dedicated perceptual-similarity library as
// a later step, only if this proves insufficient once real benchmark scoring is calibrated.
export function computePerceptualSimilarity(mismatchedPixels: number, totalPixels: number): number {
  if (totalPixels === 0) return 100;
  return 100 * Math.max(0, 1 - mismatchedPixels / totalPixels);
}
