import type { CharityNavigatorWeights } from "../types";

export const DEFAULT_CHARITY_NAVIGATOR_WEIGHTS: CharityNavigatorWeights = {
  beacons: [
    { beaconId: "accountability-finance", weight: 0.4, enabled: true },
    { beaconId: "leadership-legitimacy", weight: 0.2, enabled: true },
    { beaconId: "culture-community", weight: 0.2, enabled: true },
    { beaconId: "impact-results", weight: 0.2, enabled: true },
  ],
};

export function resolveCharityNavigatorWeights(
  override?: CharityNavigatorWeights,
): CharityNavigatorWeights {
  if (!override) {
    return DEFAULT_CHARITY_NAVIGATOR_WEIGHTS;
  }
  return {
    beacons: override.beacons.map((b) => ({
      ...b,
      enabled: b.enabled ?? true,
    })),
  };
}

export function computeEffectiveWeight(weights: CharityNavigatorWeights): number {
  const enabled = weights.beacons.filter((b) => b.enabled);
  const total = enabled.reduce((sum, b) => sum + b.weight, 0);
  if (total <= 0) {
    throw new Error("At least one Charity Navigator beacon must be enabled (Q-G2=C).");
  }
  return total;
}
