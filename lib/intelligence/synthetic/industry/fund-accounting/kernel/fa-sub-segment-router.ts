/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-G sub-segment router — M/E/H/P/C capability applicability matrix.
 * Citation: ASC_946_INVESTMENT_COMPANIES, RULE_6C_11_ETF, FORM_PF, FORM_N_CSR.
 */

import type {
  FundAccountingSubSegment,
  FundCapabilityKey,
} from "../../contracts/fund-accounting/FABasisContracts";
import {
  SubSegmentApplicabilityViolation,
  SubSegmentIsolationViolation,
} from "./errors";

/** Applicability matrix from FA-2 spec §5.1 */
const APPLICABILITY: Record<FundCapabilityKey, Partial<Record<FundAccountingSubSegment, boolean>>> = {
  "nav-daily": { M: true, E: true, H: false, P: false, C: false },
  "nav-periodic": { M: false, E: false, H: true, P: true, C: true },
  "capital-account-waterfall": { M: false, E: false, H: true, P: true, C: false },
  "fair-value-hierarchy": { M: true, E: true, H: true, P: true, C: true },
  "expense-recognition": { M: true, E: true, H: true, P: true, C: true },
  "liability-equity-classification": { M: true, E: true, H: true, P: true, C: true },
  "form-n-csr": { M: true, E: true, H: false, P: false, C: true },
  "form-pf": { M: false, E: false, H: true, P: true, C: false },
  "rule-6c-11-etf-basket": { M: false, E: true, H: false, P: false, C: false },
  "3c1-exemption": { M: false, E: false, H: true, P: true, C: false },
  "3c7-exemption": { M: false, E: false, H: true, P: true, C: false },
  "investor-lock-up": { M: false, E: false, H: true, P: true, C: false },
  "side-pocket-allocation": { M: false, E: false, H: true, P: false, C: false },
};

export function isCapabilityApplicable(
  subSegment: FundAccountingSubSegment,
  capabilityKey: FundCapabilityKey,
): boolean {
  const row = APPLICABILITY[capabilityKey];
  return row[subSegment] === true;
}

export function assertCapabilityApplicable(
  subSegment: FundAccountingSubSegment,
  capabilityKey: FundCapabilityKey,
): void {
  if (!isCapabilityApplicable(subSegment, capabilityKey)) {
    throw SubSegmentApplicabilityViolation(
      `Capability "${capabilityKey}" not applicable to sub-segment "${subSegment}"`,
      subSegment,
      capabilityKey,
    );
  }
}

/** Cross-sub-segment isolation: entity cannot access another sub-segment's cache namespace */
export function buildSubSegmentCacheKey(
  entityId: string,
  subSegment: FundAccountingSubSegment,
  capabilityKey: FundCapabilityKey,
): string {
  return `fa:${subSegment}:${entityId}:${capabilityKey}`;
}

export function assertSubSegmentIsolation(
  entitySubSegment: FundAccountingSubSegment,
  requestedSubSegment: FundAccountingSubSegment,
  capabilityKey: FundCapabilityKey,
): void {
  if (entitySubSegment !== requestedSubSegment) {
    throw SubSegmentIsolationViolation(
      `Entity sub-segment "${entitySubSegment}" cannot access "${requestedSubSegment}" capability "${capabilityKey}"`,
      entitySubSegment,
      capabilityKey,
    );
  }
}

export function getApplicableCapabilities(
  subSegment: FundAccountingSubSegment,
): FundCapabilityKey[] {
  return (Object.keys(APPLICABILITY) as FundCapabilityKey[]).filter((key) =>
    isCapabilityApplicable(subSegment, key),
  );
}
