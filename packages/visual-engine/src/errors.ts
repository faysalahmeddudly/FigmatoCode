// PRD §21.1 COMPARISON_FAILED: reference/candidate images that can't be compared at all
// (e.g. mismatched dimensions) are a typed failure, never silently resized/distorted --
// §15.1 requires normalization to come from the reference artifact, not be inferred ad hoc.
export class ImageDimensionMismatchError extends Error {
  readonly code = "COMPARISON_FAILED" as const;

  constructor(
    readonly reference: { width: number; height: number },
    readonly candidate: { width: number; height: number },
  ) {
    super(
      `Reference (${reference.width}x${reference.height}) and candidate ` +
        `(${candidate.width}x${candidate.height}) dimensions do not match`,
    );
    this.name = "ImageDimensionMismatchError";
  }
}
