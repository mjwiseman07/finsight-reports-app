import { CrossoverFootingError } from "./errors";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const VALIDATOR_NAME = "crossover-footing";

function toleranceForVertical(vertical?: "mfg" | "other" | "ifrs"): number {
  if (vertical === "mfg") {
    return 1_000;
  }
  if (vertical === "ifrs") {
    return 1;
  }
  return 1;
}

export function validateCrossoverFooting(ctx: CrossoverContext): CrossoverValidatorResult {
  const pairs = ctx.footingPairs ?? [];
  if (pairs.length === 0) {
    return {
      validator: VALIDATOR_NAME,
      passed: true,
      haltOnFailure: true,
      detail: "no cross-emitter footing pairs supplied (skip)",
    };
  }

  for (const pair of pairs) {
    const tolerance = pair.tolerance ?? toleranceForVertical(pair.vertical);
    if (Math.abs(pair.computed - pair.referenced) > tolerance) {
      throw new CrossoverFootingError(
        `${pair.label}: computed ${pair.computed} vs referenced ${pair.referenced} exceeds tolerance ${tolerance}`,
      );
    }
  }

  return {
    validator: VALIDATOR_NAME,
    passed: true,
    haltOnFailure: true,
    detail: `validated ${pairs.length} cross-disclosure footing pairs`,
  };
}
