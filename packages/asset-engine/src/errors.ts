import type { FailureClass } from "@figma-engine/shared-contracts";

// PRD §21.1: typed error, never a bare string throw from this package.
export class AssetEngineError extends Error {
  constructor(
    public readonly code: FailureClass,
    message: string,
  ) {
    super(message);
    this.name = "AssetEngineError";
  }
}
