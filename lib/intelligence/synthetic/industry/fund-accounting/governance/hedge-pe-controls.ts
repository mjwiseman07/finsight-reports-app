/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-H hedge fund + PE controls. Citation: FORM_PF, ASC_946_INVESTMENT_COMPANIES.
 */

import { RegistrationRequiredEscalation } from "../kernel/errors";
import type { FAAuditEmitter } from "../audit/fa-audit-emitter";
import { emitEscalationAudit, emitPanelDecisionAudit } from "../audit/fa-audit-emitter";
import { SidePocketIsolationViolation } from "../kernel/errors";

export const FORM_PF_HEDGE_THRESHOLD_USD = 1_500_000_000;
export const FORM_PF_PE_THRESHOLD_USD = 2_000_000_000;
export const SECTION_3C1_OWNER_CAP = 100;

export interface BeneficialOwnerRecord {
  ownerId: string;
  isQualifiedPurchaser: boolean;
}

export function assert3c1OwnerCap(
  owners: BeneficialOwnerRecord[],
  emitter: FAAuditEmitter,
  entityId: string,
): void {
  if (owners.length > SECTION_3C1_OWNER_CAP) {
    emitEscalationAudit(emitter, {
      entityId,
      reason: `3(c)(1) beneficial owner count ${owners.length} exceeds cap ${SECTION_3C1_OWNER_CAP}`,
      severity: "critical",
      violationType: "RegistrationRequiredEscalation",
    });
    throw RegistrationRequiredEscalation(
      `3(c)(1) cap exceeded: ${owners.length} owners > ${SECTION_3C1_OWNER_CAP}`,
      "3c1-owner-cap",
    );
  }
}

export function assert3c7QualifiedPurchaser(
  investor: BeneficialOwnerRecord,
  emitter: FAAuditEmitter,
  entityId: string,
): void {
  if (!investor.isQualifiedPurchaser) {
    emitEscalationAudit(emitter, {
      entityId,
      reason: "3(c)(7) non-qualified-purchaser blocked at onboarding",
      severity: "high",
      violationType: "RegistrationRequiredEscalation",
    });
    throw RegistrationRequiredEscalation(
      "3(c)(7) requires qualified purchaser",
      "3c7-non-qp",
    );
  }
}

export interface SidePocketAllocation {
  sidePocketNav: number;
  mainFundNav: number;
  sidePocketAssetIds: string[];
}

export function computeSidePocketNav(allocation: SidePocketAllocation): {
  mainNav: number;
  sidePocketNav: number;
} {
  return {
    mainNav: allocation.mainFundNav,
    sidePocketNav: allocation.sidePocketNav,
  };
}

export function assertSidePocketIsolation(
  allocation: SidePocketAllocation,
  assetIdInMainNav: string,
): void {
  if (allocation.sidePocketAssetIds.includes(assetIdInMainNav)) {
    throw SidePocketIsolationViolation(
      `Side-pocket asset ${assetIdInMainNav} must not appear in main fund NAV`,
    );
  }
}

export interface HighWaterMarkState {
  priorPeakNav: number;
  currentNav: number;
  accruedIncentiveFee: number;
}

export function crystallizeIncentiveFee(state: HighWaterMarkState): number {
  if (state.currentNav <= state.priorPeakNav) {
    return 0;
  }
  const gainAboveHwm = state.currentNav - state.priorPeakNav;
  return Math.max(0, gainAboveHwm * 0.2);
}

export function evaluateLockUpRedemption(
  lockUpEndDate: string,
  requestDate: string,
  emitter: FAAuditEmitter,
  entityId: string,
): { allowed: boolean; requiresHumanReview: boolean } {
  if (requestDate < lockUpEndDate) {
    emitEscalationAudit(emitter, {
      entityId,
      reason: "Redemption requested during lock-up period",
      severity: "medium",
      violationType: "lock-up-redemption",
    });
    return { allowed: false, requiresHumanReview: true };
  }
  return { allowed: true, requiresHumanReview: false };
}

export type WaterfallTier =
  | "return-of-capital"
  | "preferred-return"
  | "catch-up"
  | "carry";

export interface WaterfallDistribution {
  tier: WaterfallTier;
  amountUsd: number;
}

export function computePeWaterfall(
  distributionUsd: number,
  preferredReturnRate: number,
  investedCapital: number,
  priorPreferredPaid: number,
): WaterfallDistribution[] {
  const tiers: WaterfallDistribution[] = [];
  let remaining = distributionUsd;

  const roc = Math.min(remaining, investedCapital);
  tiers.push({ tier: "return-of-capital", amountUsd: roc });
  remaining -= roc;

  const preferredOwed = investedCapital * preferredReturnRate - priorPreferredPaid;
  const preferred = Math.min(remaining, Math.max(0, preferredOwed));
  tiers.push({ tier: "preferred-return", amountUsd: preferred });
  remaining -= preferred;

  const catchUp = Math.min(remaining, preferred * 0.25);
  tiers.push({ tier: "catch-up", amountUsd: catchUp });
  remaining -= catchUp;

  tiers.push({ tier: "carry", amountUsd: remaining });
  return tiers;
}

export interface RecallableDistribution {
  distributionId: string;
  amountUsd: number;
  recallable: boolean;
}

export function rollForwardRecallableFlag(
  prior: RecallableDistribution,
): RecallableDistribution {
  return { ...prior, recallable: prior.recallable };
}

export function evaluateFormPfThreshold(
  fundType: "hedge" | "private-equity",
  aumUsd: number,
  emitter: FAAuditEmitter,
  entityId: string,
): { filingRequired: boolean; section: string | null } {
  const threshold =
    fundType === "hedge" ? FORM_PF_HEDGE_THRESHOLD_USD : FORM_PF_PE_THRESHOLD_USD;
  if (aumUsd >= threshold) {
    const section = fundType === "hedge" ? "2b" : "4";
    emitPanelDecisionAudit(emitter, {
      entityId,
      decision: `Form PF Section ${section} filing required`,
      multiPartySignatures: ["compliance-officer", "cfo"],
    });
    return { filingRequired: true, section };
  }
  return { filingRequired: false, section: null };
}
