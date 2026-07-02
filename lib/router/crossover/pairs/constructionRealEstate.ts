import type { CrossoverValidatorResult } from "../types";
import type { PairCrossoverContext } from "../pairTypes";
import {
  ConReClassificationError,
  ConReContractMethodError,
  ConReCapitalizationCutoverError,
  ConReBuildToRentLessorError,
} from "../pairErrors";

export const PAIR_CODE = "con-re" as const;

export function validateHeldForSaleVsInvestmentClassification(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.heldForSale === true && e.heldForInvestment === true) {
      throw new ConReClassificationError(
        `${e.entityId}: cannot be both held-for-sale and held-for-investment simultaneously`,
      );
    }
    if (e.heldForSale !== true && e.heldForInvestment !== true) {
      throw new ConReClassificationError(
        `${e.entityId}: must declare either held-for-sale or held-for-investment at construction-to-operation transition`,
      );
    }
  }
  return {
    validator: "con-re:held-for-sale-vs-investment",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateConstructionPocVsCompletedContract(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.usesPOC === true && e.usesCompletedContract === true) {
      throw new ConReContractMethodError(
        `${e.entityId}: cannot use both POC and completed contract methods simultaneously`,
      );
    }
    if (e.usesPOC === true) {
      const hasProgressDisclosure = ctx.disclosures.some(
        (d) =>
          d.entityId === e.entityId &&
          (d.text.toLowerCase().includes("progress") || d.text.toLowerCase().includes("poc")),
      );
      if (!hasProgressDisclosure) {
        throw new ConReContractMethodError(
          `${e.entityId}: POC method requires progress-measure disclosure`,
        );
      }
    }
    if (e.usesCompletedContract === true) {
      const hasDeferredDisclosure = ctx.disclosures.some(
        (d) =>
          d.entityId === e.entityId &&
          (d.text.toLowerCase().includes("deferred") ||
            d.text.toLowerCase().includes("completed")),
      );
      if (!hasDeferredDisclosure) {
        throw new ConReContractMethodError(
          `${e.entityId}: completed contract method requires deferred-cost disclosure`,
        );
      }
    }
  }
  return {
    validator: "con-re:poc-vs-completed-contract",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateCapitalizationCutover(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.heldForInvestment === true && e.capitalizationCutoverDocumented !== true) {
      throw new ConReCapitalizationCutoverError(
        `${e.entityId}: held-for-investment transition requires documented capitalization cutover date`,
      );
    }
  }
  return {
    validator: "con-re:capitalization-cutover",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateBuildToRentLessorDisclosure(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.heldForInvestment === true && e.buildToRentLeaseUp === true) {
      const hasLessorDisclosure = ctx.disclosures.some(
        (d) => d.entityId === e.entityId && d.text.toLowerCase().includes("lessor"),
      );
      if (!hasLessorDisclosure) {
        throw new ConReBuildToRentLessorError(
          `${e.entityId}: build-to-rent lease-up requires ASC 842 lessor disclosure`,
        );
      }
    }
  }
  return {
    validator: "con-re:build-to-rent-lessor",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}
