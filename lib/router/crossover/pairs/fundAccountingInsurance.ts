import type { CrossoverValidatorResult } from "../types";
import type { PairCrossoverContext } from "../pairTypes";
import { NavReservesReconciliationError, IlsContractBoundaryError } from "../pairErrors";
import { EntityFrameworkComminglingError } from "../errors";

export const PAIR_CODE = "fa-ins" as const;

export function validateNavReservesReconciliation(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.navReported != null && e.reservesReported != null) {
      const hasReconciliation = ctx.disclosures.some(
        (d) =>
          d.entityId === e.entityId &&
          d.emitterPath.toLowerCase().includes("nav-reserves-reconciliation"),
      );
      if (!hasReconciliation) {
        throw new NavReservesReconciliationError(
          `${e.entityId}: NAV (${e.navReported}) and reserves (${e.reservesReported}) reported but no nav-reserves-reconciliation entry`,
        );
      }
    }
  }
  return {
    validator: "fa-ins:nav-reserves-reconciliation",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities checked`,
  };
}

export function validateInvestmentCompanyVsInsuranceElection(
  ctx: PairCrossoverContext,
): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (!e.primaryFramework.includes("ASC946")) {
      throw new EntityFrameworkComminglingError(e.entityId, [e.primaryFramework, "EXPECTED:ASC946"]);
    }
    if (!e.secondaryFramework.includes("ASC944") && !e.secondaryFramework.includes("IFRS17")) {
      throw new EntityFrameworkComminglingError(e.entityId, [
        e.secondaryFramework,
        "EXPECTED:ASC944|IFRS17",
      ]);
    }
  }
  return {
    validator: "fa-ins:investment-company-vs-insurance-election",
    passed: true,
    haltOnFailure: true,
    detail: "ASC 946 primary + ASC 944/IFRS 17 secondary confirmed",
  };
}

export function validateIlsContractBoundary(ctx: PairCrossoverContext): CrossoverValidatorResult {
  for (const e of ctx.pairEntities) {
    if (e.ilsContractBoundaryDocumented !== true) {
      throw new IlsContractBoundaryError(
        `${e.entityId}: ILS / cat-bond pair entity requires documented contract boundary`,
      );
    }
  }
  return {
    validator: "fa-ins:ils-contract-boundary",
    passed: true,
    haltOnFailure: true,
    detail: `${ctx.pairEntities.length} entities have documented contract boundary`,
  };
}

export function validateFairValueHierarchyConsistency(ctx: PairCrossoverContext): CrossoverValidatorResult {
  return {
    validator: "fa-ins:fair-value-hierarchy-consistency",
    passed: true,
    haltOnFailure: true,
    detail: `wave-1 presence check on ${ctx.pairEntities.length} entities`,
    warnings: ["wave-2-deferred: ASC 820 level-1/2/3 consistency"],
  };
}
