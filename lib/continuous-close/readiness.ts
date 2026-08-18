/**
 * Continuous Close readiness — product contract:
 * READY | READY_WITH_REVIEW | BLOCKED
 */

import type { ContinuousCloseException } from "./exceptions";
import type { ContinuousCloseReadinessState } from "./types";

export type ContinuousCloseReadinessResult = {
  state: ContinuousCloseReadinessState;
  blockerCodes: string[];
  reviewCodes: string[];
};

export function composeContinuousCloseReadiness(
  exceptions: readonly ContinuousCloseException[],
): ContinuousCloseReadinessResult {
  const blockers = exceptions.filter((e) => e.disposition === "block");
  const reviews = exceptions.filter((e) => e.disposition === "review");

  if (blockers.length > 0) {
    return {
      state: "BLOCKED",
      blockerCodes: blockers.map((e) => e.code),
      reviewCodes: reviews.map((e) => e.code),
    };
  }

  if (reviews.length > 0) {
    return {
      state: "READY_WITH_REVIEW",
      blockerCodes: [],
      reviewCodes: reviews.map((e) => e.code),
    };
  }

  return {
    state: "READY",
    blockerCodes: [],
    reviewCodes: [],
  };
}
