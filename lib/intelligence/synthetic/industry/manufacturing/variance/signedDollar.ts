import type { ManufacturingSignedDollarVariance } from "../../../../../dashboard/panels/manufacturing-variance/contract";

/** Single source of truth for sign-tag invariant (MFG-K-F sub-spec). */
export function makeSignedDollar(amountUsd: number): ManufacturingSignedDollarVariance {
  if (amountUsd < 0) return { amountUsd, signTag: "F" };
  if (amountUsd > 0) return { amountUsd, signTag: "U" };
  return { amountUsd: 0, signTag: "F" };
}
