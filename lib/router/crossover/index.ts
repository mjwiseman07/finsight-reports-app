import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GapRegister } from "../../../scripts/external-truth/types";
import { validateCollapseStepDocumentation } from "./collapseStepValidator";
import { validateCrossoverFooting } from "./crossoverFootingValidator";
import { validateEmitterPathIntegrity } from "./emitterPathValidator";
import { validateFrameworkConsistency } from "./frameworkConsistencyValidator";
import { validateLessorGapSurveillance } from "./lessorGapSurveillance";
import { validateRegisterClassification } from "./registerClassificationValidator";
import { validateRegisterSchemaV120 } from "./registerSchemaValidator";
import { validateTimestampDrift } from "./timestampDriftValidator";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const CROSSOVER_VALIDATORS = [
  validateFrameworkConsistency,
  validateEmitterPathIntegrity,
  validateCrossoverFooting,
  validateLessorGapSurveillance,
  validateRegisterClassification,
  validateTimestampDrift,
  validateCollapseStepDocumentation,
] as const;

export function loadDefaultCrossoverContext(repoRoot: string): CrossoverContext {
  const register = JSON.parse(
    readFileSync(join(repoRoot, "reports/g7-gap-register.json"), "utf8"),
  ) as GapRegister;
  return {
    register,
    disclosures: [],
    repoRoot,
  };
}

export function runAllCrossoverValidators(ctx: CrossoverContext): CrossoverValidatorResult[] {
  validateRegisterSchemaV120(ctx);
  return CROSSOVER_VALIDATORS.map((validator) => validator(ctx));
}

export {
  validateFrameworkConsistency,
  validateEmitterPathIntegrity,
  validateCrossoverFooting,
  validateLessorGapSurveillance,
  validateRegisterClassification,
  validateTimestampDrift,
  validateCollapseStepDocumentation,
  validateRegisterSchemaV120,
};

// === G7-C7 Wave 1 additive exports (do not modify lines above) ===
export { runCrossoverForPair, PAIR_VALIDATORS, describePair } from "./pairRegistry";
export type {
  CrossoverPairCode,
  CrossoverPairDescriptor,
  PairCrossoverContext,
  PairFixtureEntity,
  PairCrossoverValidator,
} from "./pairTypes";
export { ALL_PAIRS } from "./pairTypes";
