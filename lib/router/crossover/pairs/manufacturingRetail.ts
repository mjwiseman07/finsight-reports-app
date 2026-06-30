import type { CrossoverValidatorResult } from "../types";
import type { PairCrossoverContext } from "../pairTypes";
import {
  MfgRtlInventoryComminglingError,
  MfgRtlMarginMethodError,
  MfgRtlLeaseDualityError,
  MfgRtlSegmentBoundaryError,
} from "../pairErrors";

export const PAIR_CODE = "mfg-rtl" as const;

export function validateInventoryDecomposition(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.primaryVertical === "mfg") {
      if (e.inventoryHasWIP !== true) {
        throw new MfgRtlInventoryComminglingError(
          `${e.entityId}: manufacturing-side entity must declare WIP inventory breakdown`,
        );
      }
    }
    if (e.primaryVertical === "rtl") {
      if (e.inventoryHasFGOnly !== true) {
        throw new MfgRtlInventoryComminglingError(
          `${e.entityId}: retail-side entity must declare FG-only inventory`,
        );
      }
      if (e.inventoryHasWIP === true) {
        throw new MfgRtlInventoryComminglingError(
          `${e.entityId}: retail-side entity must NOT carry WIP inventory`,
        );
      }
    }
  }
  return {
    validator: "mfg-rtl:inventory-decomposition",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateMarginMethodConsistency(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.primaryVertical === "mfg" && e.marginMethod === "markup") {
      throw new MfgRtlMarginMethodError(
        `${e.entityId}: manufacturing segment cannot use markup margin method`,
      );
    }
    if (e.primaryVertical === "rtl" && e.marginMethod === "cost-plus") {
      throw new MfgRtlMarginMethodError(
        `${e.entityId}: retail segment cannot use cost-plus margin method`,
      );
    }
  }
  return {
    validator: "mfg-rtl:margin-method-consistency",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateLeasePortfolioDuality(ctx: PairCrossoverContext): CrossoverValidatorResult {
  const hasOwnedMfg = ctx.pairEntities.some((e) => e.ownedManufacturingFacility === true);
  const hasLeasedRtl = ctx.pairEntities.some((e) => e.leasedRetailStorefront === true);
  if (hasOwnedMfg && hasLeasedRtl) {
    const hasLessorDisclosure = ctx.disclosures.some(
      (d) =>
        d.text.toLowerCase().includes("lessor") ||
        d.emitterPath.toLowerCase().includes("lessor"),
    );
    const hasLesseeDisclosure = ctx.disclosures.some(
      (d) =>
        d.text.toLowerCase().includes("lessee") || d.emitterPath.toLowerCase().includes("lease"),
    );
    if (!hasLessorDisclosure || !hasLesseeDisclosure) {
      throw new MfgRtlLeaseDualityError(
        `pair ${ctx.pair.code}: owned-mfg + leased-rtl combo requires both lessor and lessee ASC 842 disclosures`,
      );
    }
  }
  return {
    validator: "mfg-rtl:lease-portfolio-duality",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateSegmentBoundaryConsistency(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.singleSegmentAggregation === true && e.segmentAggregationJustified !== true) {
      throw new MfgRtlSegmentBoundaryError(
        `${e.entityId}: single-segment aggregation requires ASC 280 justification narrative`,
      );
    }
  }
  return {
    validator: "mfg-rtl:segment-boundary",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}
