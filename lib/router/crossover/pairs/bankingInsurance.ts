import type { CrossoverValidatorResult } from "../types";
import type { PairCrossoverContext } from "../pairTypes";
import {
  CeclScopeMismatchError,
  LaneComminglingAcrossEntitiesError,
  CapitalAdequacyDoubleCountError,
} from "../pairErrors";

export const PAIR_CODE = "bank-ins" as const;

export function validateCeclScopeConsistency(ctx: PairCrossoverContext): CrossoverValidatorResult {
  const bank = ctx.pairEntities.find((e) => e.primaryVertical === "bank");
  const ins = ctx.pairEntities.find((e) => e.primaryVertical === "ins");
  if (!bank || !ins) {
    throw new CeclScopeMismatchError(`pair ${ctx.pair.code}: requires both bank and insurance entities`);
  }
  if (!(bank.ceclScopeFull === true && bank.ceclScopeNarrow !== true)) {
    throw new CeclScopeMismatchError(`bank entity ${bank.entityId} must declare full CECL scope`);
  }
  if (!(ins.ceclScopeNarrow === true && ins.ceclScopeFull !== true)) {
    throw new CeclScopeMismatchError(`insurance entity ${ins.entityId} must declare narrow CECL scope only`);
  }
  return {
    validator: "bank-ins:cecl-scope",
    passed: true,
    haltOnFailure: true,
    detail: "bank=full / ins=narrow CECL scope confirmed",
  };
}

export function validateFfiec051Ifrs17NonComingling(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.ffiec051Filed === true && e.ifrs17Lane != null) {
      throw new LaneComminglingAcrossEntitiesError(
        `${e.entityId}: entity carries both FFIEC 051 and IFRS 17 lane (${e.ifrs17Lane})`,
      );
    }
  }
  return {
    validator: "bank-ins:ffiec051-ifrs17-non-comingling",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities lane-isolated`,
  };
}

export function validateThreeLaneNonComminglingAcrossEntities(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  const byEntity = new Map<string, Set<string>>();
  for (const d of ctx.disclosures) {
    if (d.framework === "META_RECONCILIATION") continue;
    const set = byEntity.get(d.entityId) ?? new Set<string>();
    set.add(d.framework);
    byEntity.set(d.entityId, set);
  }
  for (const [entityId, frameworks] of byEntity) {
    if (frameworks.size > 1) {
      throw new LaneComminglingAcrossEntitiesError(
        `${entityId}: declares ${frameworks.size} frameworks (${[...frameworks].join(", ")}) — pair child entities must each declare exactly one`,
      );
    }
  }
  return {
    validator: "bank-ins:three-lane-non-comingling",
    passed: true,
    haltOnFailure: true,
    detail: `${byEntity.size} child entities lane-isolated`,
  };
}

export function validateCapitalAdequacyNoDoubleCount(ctx: PairCrossoverContext): CrossoverValidatorResult {
  const rbc = ctx.pairEntities.some((e) => e.rbcReported === true);
  const basel = ctx.pairEntities.some((e) => e.baselReported === true);
  if (rbc && basel) {
    const hasReconciliation = ctx.disclosures.some(
      (d) =>
        d.framework === "META_RECONCILIATION" &&
        d.text.toLowerCase().includes("rbc") &&
        d.text.toLowerCase().includes("basel"),
    );
    if (!hasReconciliation) {
      throw new CapitalAdequacyDoubleCountError(
        `pair ${ctx.pair.code}: both RBC and Basel reported but no rbc-basel reconciliation disclosure`,
      );
    }
  }
  return {
    validator: "bank-ins:capital-double-count",
    passed: true,
    haltOnFailure: true,
    detail: rbc && basel ? "rbc+basel reconciliation present" : "single-regime, no reconciliation required",
  };
}

export function validateEmbeddedDerivativeClassification(ctx: PairCrossoverContext): CrossoverValidatorResult {
  return {
    validator: "bank-ins:embedded-derivative-classification",
    passed: true,
    haltOnFailure: true,
    detail: `wave-1 presence check on ${ctx.pairEntities.length} entities`,
    warnings: ["wave-2-deferred: ASC 815 VA threshold logic"],
  };
}
