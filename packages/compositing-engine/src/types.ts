export type CapabilityTier = "A" | "B" | "C";

export interface MappingResult<T> {
  tier: CapabilityTier;
  css?: T;
  unresolvedReason?: string;
}
