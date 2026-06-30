import type { CrossoverValidatorResult } from "../types";
import type { PairCrossoverContext } from "../pairTypes";
import {
  HcEduGrantClassificationError,
  HcEduTuitionCharityThresholdError,
  HcEduSchedule990ReferenceError,
  HcEduEndowmentComminglingError,
} from "../pairErrors";

export const PAIR_CODE = "hc-edu" as const;

export function validateMedicalResearchGrantClassification(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.restrictedResearchGrant === true) {
      const hasHcGrantDisclosure = ctx.disclosures.some(
        (d) =>
          d.entityId === e.entityId &&
          d.emitterPath.toLowerCase().includes("healthcare") &&
          d.text.toLowerCase().includes("grant"),
      );
      const hasEduGrantDisclosure = ctx.disclosures.some(
        (d) =>
          d.entityId === e.entityId &&
          d.emitterPath.toLowerCase().includes("education") &&
          d.text.toLowerCase().includes("grant"),
      );
      if (!hasHcGrantDisclosure || !hasEduGrantDisclosure) {
        throw new HcEduGrantClassificationError(
          `${e.entityId}: restricted research grant must be disclosed under both healthcare and education paths`,
        );
      }
    }
  }
  return {
    validator: "hc-edu:medical-research-grant-classification",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateTuitionVsCharityCareThreshold(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.charityCareThresholdMet === true && e.tuitionDiscountThresholdMet === true) {
      const hasCharityDisclosure = ctx.disclosures.some(
        (d) => d.entityId === e.entityId && d.text.toLowerCase().includes("charity"),
      );
      const hasTuitionDisclosure = ctx.disclosures.some(
        (d) => d.entityId === e.entityId && d.text.toLowerCase().includes("tuition"),
      );
      if (!hasCharityDisclosure || !hasTuitionDisclosure) {
        throw new HcEduTuitionCharityThresholdError(
          `${e.entityId}: both thresholds met but charity and/or tuition disclosure path missing`,
        );
      }
    }
  }
  return {
    validator: "hc-edu:tuition-charity-threshold",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateForm990ScheduleHEReference(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.has501c3Marker === true) {
      if (e.hasScheduleHDisclosure !== true || e.hasScheduleEDisclosure !== true) {
        throw new HcEduSchedule990ReferenceError(
          `${e.entityId}: 501(c)(3) academic medical center requires both Schedule H and Schedule E disclosure`,
        );
      }
    }
  }
  return {
    validator: "hc-edu:form-990-schedule-h-e-reference",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateEndowmentSegregation(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.endowmentSegregated === false) {
      throw new HcEduEndowmentComminglingError(
        `${e.entityId}: endowment funds must be segregated from healthcare restricted fund classifications`,
      );
    }
  }
  return {
    validator: "hc-edu:endowment-segregation",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}
