// PRD §15.4 Fidelity Score v1. The full formula has six components:
//   Geometry 20%, Layout 20%, Typography 15%, Style 15%, Assets 10%, Perceptual 20%
// As of M3 only Geometry (geometry-engine) and Perceptual (visual-engine) are actually
// computed. Layout, Typography, Style, and Assets have no dedicated comparison engine yet
// (those need font-metric comparison, per-property style diffing, and asset-hash matching
// respectively -- none built yet). Rather than defaulting missing components to 100 (which
// would silently inflate the score and violate the project's own no-silent-approximation
// principle, §32.2), this renormalizes the weighted average across only the components
// actually supplied and records which ones were used vs. omitted.
export const FIDELITY_WEIGHTS_V1 = {
  geometry: 0.2,
  layout: 0.2,
  typography: 0.15,
  style: 0.15,
  assets: 0.1,
  perceptual: 0.2,
} as const;

export type FidelityComponentName = keyof typeof FIDELITY_WEIGHTS_V1;
export type FidelityComponents = Partial<Record<FidelityComponentName, number>>;

export interface FidelityScoreResult {
  score: number;
  scoreProfileId: string;
  componentsUsed: FidelityComponentName[];
  componentsMissing: FidelityComponentName[];
}

export function computeFidelityScore(
  components: FidelityComponents,
  scoreProfileId = "v1-partial",
): FidelityScoreResult {
  const componentsUsed: FidelityComponentName[] = [];
  const componentsMissing: FidelityComponentName[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const name of Object.keys(FIDELITY_WEIGHTS_V1) as FidelityComponentName[]) {
    const value = components[name];
    if (value === undefined) {
      componentsMissing.push(name);
      continue;
    }
    componentsUsed.push(name);
    const weight = FIDELITY_WEIGHTS_V1[name];
    weightedSum += weight * value;
    weightTotal += weight;
  }

  const score = weightTotal === 0 ? 0 : weightedSum / weightTotal;

  return {
    score: Math.round(score * 100) / 100,
    scoreProfileId,
    componentsUsed,
    componentsMissing,
  };
}
