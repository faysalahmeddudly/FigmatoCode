export class DesignDocumentValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Design document failed validation:\n${issues.join("\n")}`);
    this.name = "DesignDocumentValidationError";
    this.issues = issues;
  }
}
