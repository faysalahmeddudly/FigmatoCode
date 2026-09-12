// PRD §14.11.8 capability tiers -- see effect-engine's types.ts for the same definition
// (duplicated per §25 package independence).
export type CapabilityTier = "A" | "B" | "C";

export interface MappingResult<T> {
  tier: CapabilityTier;
  css?: T;
  unresolvedReason?: string;
}
