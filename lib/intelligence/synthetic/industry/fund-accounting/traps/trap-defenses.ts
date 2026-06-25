/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-J cross-blend trap defenses — 6 traps from FA-1 recon.
 */

import type { FundAccountingPanelContext } from "../../contracts/fund-accounting/FABasisContracts";
import type { FAAuditEmitter } from "../audit/fa-audit-emitter";
import { emitEscalationAudit } from "../audit/fa-audit-emitter";
import {
  SubSegmentApplicabilityViolation,
  FrameworkMismatchViolation,
  CrossTenantMemoryViolation,
  SidePocketIsolationViolation,
} from "../kernel/errors";
import { assertCapabilityApplicable } from "../kernel/fa-sub-segment-router";
import { evaluateFormPfThreshold } from "../governance/hedge-pe-controls";
import { assertSidePocketIsolation } from "../governance/hedge-pe-controls";

function violationName(e: unknown): string {
  return e instanceof Error ? e.name : "";
}

/** Trap 1: M entity asks for periodic-only NAV */
export function defendTrap1_MutualDailyNavBleed(context: FundAccountingPanelContext): void {
  if (context.subSegment === "M") {
    assertCapabilityApplicable(context.subSegment, "nav-periodic");
  }
}

/** Trap 2: US GAAP entity requests IFRS 10.27 investment entity exception */
export function defendTrap2_InvestmentEntityLeak(
  context: FundAccountingPanelContext,
  requestedTreatment: "investment-entity-exception" | "standard" = "standard",
): void {
  if (
    context.primaryFramework === "US_GAAP" &&
    requestedTreatment === "investment-entity-exception"
  ) {
    throw FrameworkMismatchViolation(
      "Trap 2: IFRS 10 investment entity exception must not apply to US GAAP entity",
      context.primaryFramework,
      "IFRS",
    );
  }
}

/** Trap 3: M entity invokes waterfall */
export function defendTrap3_CarryContamination(context: FundAccountingPanelContext): void {
  if (context.subSegment === "M") {
    assertCapabilityApplicable(context.subSegment, "capital-account-waterfall");
  }
}

/** Trap 4: $1B AUM hedge fund must not fire Form PF */
export function defendTrap4_FormPfMisfire(
  aumUsd: number,
  emitter: FAAuditEmitter,
  entityId: string,
): void {
  const result = evaluateFormPfThreshold("hedge", aumUsd, emitter, entityId);
  if (aumUsd < 1_500_000_000 && result.filingRequired) {
    throw new Error("Trap 4: Form PF must not fire below $1.5B AUM threshold");
  }
}

/** Trap 5: side-pocket asset in main NAV */
export function defendTrap5_SidePocketCross(
  sidePocketAssetIds: string[],
  mainNavAssetIds: string[],
): void {
  for (const assetId of sidePocketAssetIds) {
    if (mainNavAssetIds.includes(assetId)) {
      assertSidePocketIsolation(
        { sidePocketNav: 0, mainFundNav: 0, sidePocketAssetIds },
        assetId,
      );
    }
  }
  const overlap = sidePocketAssetIds.filter((id) => mainNavAssetIds.includes(id));
  if (overlap.length > 0) {
    throw SidePocketIsolationViolation(
      `Trap 5: side-pocket assets in main NAV: ${overlap.join(", ")}`,
    );
  }
}

/** Trap 6: cross-customer memory leak */
const tenantMemoryStore = new Map<string, Map<string, unknown>>();

export function writeFrameworkScopedMemory(
  customerId: string,
  framework: string,
  capabilityKey: string,
  value: unknown,
): void {
  const key = `${customerId}:${framework}:${capabilityKey}`;
  if (!tenantMemoryStore.has(customerId)) {
    tenantMemoryStore.set(customerId, new Map());
  }
  tenantMemoryStore.get(customerId)!.set(key, value);
}

export function readFrameworkScopedMemory(
  readerCustomerId: string,
  ownerCustomerId: string,
  framework: string,
  capabilityKey: string,
): unknown {
  if (readerCustomerId !== ownerCustomerId) {
    throw CrossTenantMemoryViolation(
      `Trap 6: customer ${readerCustomerId} cannot read ${ownerCustomerId} memory`,
    );
  }
  const key = `${ownerCustomerId}:${framework}:${capabilityKey}`;
  return tenantMemoryStore.get(ownerCustomerId)?.get(key);
}

export function defendTrap6_CrossCustomerLeak(
  customerA: string,
  customerB: string,
  framework: string,
  capabilityKey: string,
  emitter: FAAuditEmitter,
): void {
  try {
    readFrameworkScopedMemory(customerB, customerA, framework, capabilityKey);
  } catch (e) {
    if (violationName(e) === "CrossTenantMemoryViolation") {
      emitEscalationAudit(emitter, {
        entityId: customerB,
        reason: e instanceof Error ? e.message : "cross-tenant blocked",
        severity: "critical",
        violationType: "CrossTenantMemoryViolation",
      });
      return;
    }
    throw e;
  }
  throw CrossTenantMemoryViolation("Trap 6: cross-customer read should have been blocked");
}

/** Reset tenant store for test isolation */
export function resetTenantMemoryStore(): void {
  tenantMemoryStore.clear();
}
