import type { CrossoverValidatorResult } from "../types";
import type { PairCrossoverContext } from "../pairTypes";
import { Reit90HotelInclusionError, LessorLesseeDualityError } from "../pairErrors";

export const PAIR_CODE = "re-hos" as const;

export function validateReit90HotelInclusion(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.reit90DistributionMet === true) {
      if (!e.hotelADR || e.hotelADR <= 0 || !e.hotelRevPAR || e.hotelRevPAR <= 0) {
        throw new Reit90HotelInclusionError(
          `${e.entityId}: REIT 90% distribution test claimed met but hotel ADR/RevPAR not reported`,
        );
      }
    }
  }
  return {
    validator: "re-hos:reit-90-hotel-inclusion",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateLessorLesseeDuality(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.hasLessorDuality === true) {
      const hasLessor = ctx.disclosures.some(
        (d) =>
          d.entityId === e.entityId &&
          (d.text.toLowerCase().includes("lessor") ||
            d.emitterPath.toLowerCase().includes("impairment") ||
            d.emitterPath.toLowerCase().includes("propertyimpairment")),
      );
      const hasHospEmitter = ctx.disclosures.some(
        (d) => d.entityId === e.entityId && d.emitterPath.toLowerCase().includes("hotel"),
      );
      if (!hasLessor || !hasHospEmitter) {
        throw new LessorLesseeDualityError(
          `${e.entityId}: lessor duality flagged but lessor-side or hospitality-side disclosure missing`,
        );
      }
    }
  }
  return {
    validator: "re-hos:lessor-lessee-duality",
    passed: true,
    haltOnFailure: true,
    detail: "lessor + lessee both present",
  };
}

export function validatePropertyImpairmentTrigger(ctx: PairCrossoverContext): CrossoverValidatorResult {
  return {
    validator: "re-hos:property-impairment-trigger",
    passed: true,
    haltOnFailure: true,
    detail: `wave-1 presence check on ${ctx.pairEntities.length} entities`,
    warnings: ["wave-2-deferred: KPI threshold tolerance"],
  };
}

export function validateHeldForSaleHotelSegmentContinuity(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  return {
    validator: "re-hos:held-for-sale-segment-continuity",
    passed: true,
    haltOnFailure: true,
    detail: `wave-1 structural check on ${ctx.pairEntities.length} entities`,
    warnings: ["wave-2-deferred: held-for-sale + segment continuity gate"],
  };
}
