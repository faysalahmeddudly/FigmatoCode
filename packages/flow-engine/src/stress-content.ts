// PRD §17.3 dynamic-content stress suite.
export const STRESS_TIERS = ["SHORT", "NORMAL", "LONG", "EXTREME"] as const;
export type StressTier = (typeof STRESS_TIERS)[number];

const TIER_MULTIPLIER: Record<StressTier, number> = {
  SHORT: 0.25,
  NORMAL: 1,
  LONG: 3,
  EXTREME: 8,
};

// Every stress variant is derived from the node's own real reference content (truncation or
// repetition), never fabricated text -- inventing content would contaminate the Fidelity
// comparison with text Figma never specified.
export function generateStressContent(content: string, tier: StressTier): string {
  const multiplier = TIER_MULTIPLIER[tier];

  if (multiplier === 1) return content;

  if (multiplier < 1) {
    const targetLength = Math.max(1, Math.round(content.length * multiplier));
    return content.slice(0, targetLength);
  }

  const targetLength = Math.ceil(content.length * multiplier);
  const parts: string[] = [];
  while (parts.join(" ").length < targetLength) parts.push(content);
  return parts.join(" ");
}
