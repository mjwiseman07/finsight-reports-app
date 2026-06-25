/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-J — 7 healthcare cross-blend trap defenses.
 */

import type { HealthcarePanelContext } from "../../contracts/healthcare/HCBasisContracts";
import type { HCAuditEmitter } from "../audit/hc-audit-emitter";
import {
  CharityCareSegregationViolation,
  CrossTenantPHIViolation,
  Diversion340BViolation,
  DiscountStackingViolation,
  PayerRoutingViolation,
  PlaceOfServiceViolation,
} from "../kernel/errors";
import { readCrossTenantPhi, resetTenantPhiMemory, writePhiDerivedMemory } from "../governance/hipaa-controls";
import { assert340bEligibleEncounter } from "../governance/340b-segregation";
import { escalateCharityCareReclassifiedAsBadDebt } from "../governance/501r-charity-care";

/** Trap 1: PHI bleed across tenants */
export function defendTrap1_PhiBleedAcrossTenants(
  tenantA: string,
  tenantB: string,
  emitter: HCAuditEmitter,
  entityId: string,
): void {
  writePhiDerivedMemory(tenantA, "ppd", { token: "a" }, true);
  readCrossTenantPhi(tenantB, tenantA, "ppd", emitter, entityId);
}

/** Trap 2: 340B vs commercial pricing leakage */
export function defendTrap2_340bCommercialLeak(
  drug340b: boolean,
  revenuePool: "340b" | "commercial",
): void {
  assert340bEligibleEncounter(drug340b, revenuePool === "340b");
  if (drug340b && revenuePool === "commercial") {
    throw Diversion340BViolation("Trap 2: 340B drug appears in commercial revenue");
  }
}

/** Trap 3: Medicare DRG vs commercial UB-04 routing */
export function defendTrap3_DrgUb04Routing(
  payerClass: "medicare" | "commercial",
  router: "drg" | "ub04",
): void {
  if (payerClass === "commercial" && router === "drg") {
    throw PayerRoutingViolation("Trap 3: commercial claim routed through DRG grouper");
  }
}

/** Trap 4: 501(r) charity care segregation breach */
export function defendTrap4_CharityCareReclass(
  reclassified: boolean,
  emitter: HCAuditEmitter,
  params: { entityId: string; tenantId: string },
): void {
  if (reclassified) {
    escalateCharityCareReclassifiedAsBadDebt(emitter, {
      ...params,
      writeOffId: "wo-trap4",
    });
    throw CharityCareSegregationViolation("Trap 4: charity write-off recategorized silently");
  }
}

/** Trap 5: Self-pay vs insurance discount stacking */
export function defendTrap5_DiscountStacking(
  selfPayDiscount: boolean,
  insuranceContractual: boolean,
): void {
  if (selfPayDiscount && insuranceContractual) {
    throw DiscountStackingViolation("Trap 5: self-pay discount + insurance contractual stack");
  }
}

/** Trap 6: CMS cost-report reconciliation drift (stub) */
export function defendTrap6_CostReportDrift(
  priorBasis: number,
  currentBasis: number,
  thresholdPct: number,
): void {
  const drift = Math.abs(currentBasis - priorBasis) / Math.max(priorBasis, 1);
  if (drift > thresholdPct) {
    throw new Error("Trap 6: cost basis drift across reporting period");
  }
}

/** Trap 7: Provider-based vs freestanding billing */
export function defendTrap7_PlaceOfService(
  billingMode: "provider-based" | "freestanding",
  claimPos: "provider-based" | "freestanding",
): void {
  if (billingMode === "provider-based" && claimPos === "freestanding") {
    throw PlaceOfServiceViolation("Trap 7: provider-based clinic billed as freestanding");
  }
}

export function resetHealthcareTrapState(): void {
  resetTenantPhiMemory();
}

export function defendTrap1_BlockCrossTenantSignal(
  tenantA: string,
  tenantB: string,
  emitter: HCAuditEmitter,
): boolean {
  try {
    defendTrap1_PhiBleedAcrossTenants(tenantA, tenantB, emitter, "ent-trap1");
    return false;
  } catch (e) {
    return e instanceof Error && e.name === "CrossTenantPHIViolation";
  }
}

export function baseHospitalContext(
  overrides: Partial<HealthcarePanelContext> = {},
): HealthcarePanelContext {
  return {
    companyId: "co-hc",
    entityId: "ent-h",
    tenantId: "tenant-hc",
    reportingBasis: "US_GAAP",
    subSegment: "H",
    primaryFramework: "US_GAAP",
    nonprofitHospital501r: true,
    eligible340b: true,
    ...overrides,
  };
}
