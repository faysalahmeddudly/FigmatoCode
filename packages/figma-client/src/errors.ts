// PRD §21.1 typed failure classes relevant to Figma retrieval.
export type FigmaClientErrorCode =
  "AUTH_FAILED" | "FIGMA_RATE_LIMIT" | "FIGMA_UNAVAILABLE" | "NODE_NOT_FOUND";

export class FigmaClientError extends Error {
  readonly code: FigmaClientErrorCode;
  readonly status?: number;

  constructor(code: FigmaClientErrorCode, message: string, status?: number) {
    super(message);
    this.name = "FigmaClientError";
    this.code = code;
    this.status = status;
  }
}
