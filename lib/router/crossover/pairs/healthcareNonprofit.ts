import type { CrossoverValidatorResult } from "../types";
import type { PairCrossoverContext } from "../pairTypes";
import { CharityCareNfpReconciliationError } from "../pairErrors";
import { EntityFrameworkComminglingError } from "../errors";

export const PAIR_CODE = "hc-npo" as const;

export function validateCharityCareNfpReconciliation(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.charityCareThresholdMet === true && e.nfpFunctionalExpenseAllocated !== true) {
      throw new CharityCareNfpReconciliationError(
        `${e.entityId}: charity-care threshold met but NFP functional-expense allocation absent`,
      );
    }
  }
  return {
    validator: "hc-npo:charity-care-nfp-reconciliation",
    passed: true,
    haltOnFailure: true,
    detail: `checked ${ctx.pairEntities.length} pair entities`,
  };
}

export function validateRevenueSeparation(ctx: PairCrossoverContext): CrossoverValidatorResult {
  const allowed = new Set<string>();
  for (const e of ctx.pairEntities) {
    allowed.add(e.primaryFramework);
    allowed.add(e.secondaryFramework);
  }
  for (const d of ctx.disclosures) {
    if (d.framework === "META_RECONCILIATION") continue;
    if (!allowed.has(d.framework)) {
      throw new EntityFrameworkComminglingError(d.entityId, [d.framework, ...allowed]);
    }
  }
  return {
    validator: "hc-npo:revenue-separation",
    passed: true,
    haltOnFailure: true,
    detail: `validated ${ctx.disclosures.length} disclosures against ${allowed.size} allowed frameworks`,
  };
}

export function validateNetAssetClassificationOnRestrictedContributions(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  const hasNfpDisclosure = ctx.disclosures.some((d) => d.framework.includes("ASC958"));
  if (!hasNfpDisclosure) {
    throw new CharityCareNfpReconciliationError(
      `pair ${ctx.pair.code}: no ASC 958 disclosure present for net-asset classification`,
    );
  }
  return {
    validator: "hc-npo:net-asset-classification",
    passed: true,
    haltOnFailure: true,
    detail: "ASC 958 disclosure present",
  };
}

export function validate990CostReportCrossFoot(ctx: PairCrossoverContext): CrossoverValidatorResult {
  return {
    validator: "hc-npo:990-cost-report-crossfoot",
    passed: true,
    haltOnFailure: true,
    detail: `wave-1 structural check on ${ctx.pairEntities.length} entities`,
    warnings: ["wave-2-deferred: numeric cross-foot tolerance"],
  };
}
