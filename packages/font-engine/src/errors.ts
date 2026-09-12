// PRD §14.9: if the exact benchmark font is unavailable, the run fails with FONT_MISSING;
// silent substitution is prohibited.
export class FontMissingError extends Error {
  readonly code = "FONT_MISSING" as const;
  readonly family: string;
  readonly weight: number;
  readonly style: "normal" | "italic";

  constructor(family: string, weight: number, style: "normal" | "italic", cause?: string) {
    super(`Font not available: ${family} ${weight} ${style}${cause ? ` (${cause})` : ""}`);
    this.name = "FontMissingError";
    this.family = family;
    this.weight = weight;
    this.style = style;
  }
}
