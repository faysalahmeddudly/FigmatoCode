// PRD §14.11.8 capability tiers: A = direct, pixel-accurate CSS mapping; B = CSS mapping
// exists but is a documented approximation of Figma's own algorithm; C = no CSS equivalent,
// must route to UNRESOLVED_RENDERING rather than a silent approximation (§32.2).
export type CapabilityTier = "A" | "B" | "C";

export interface MappingResult<T> {
  tier: CapabilityTier;
  css?: T;
  unresolvedReason?: string;
}
