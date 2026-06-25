/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * DRAFT/SPEC — Phase FA-2 K-0 basis contracts for Fund Accounting Wave 2.
 * Citation handles: ASC_946_INVESTMENT_COMPANIES, IFRS_10_CONSOLIDATION.
 */

import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";

/** M=Mutual, E=ETF, H=Hedge, P=Private Equity, C=Closed-end */
export type FundAccountingSubSegment = "M" | "E" | "H" | "P" | "C";

export interface FundAccountingPanelContext {
  companyId: string;
  entityId?: string;
  reportingBasis: ReportingBasis;
  subSegment: FundAccountingSubSegment;
  /** Primary framework code from org election or resolver */
  primaryFramework: "US_GAAP" | "IFRS" | "IFRS_SME";
  /** Secondary book for dual-book entities; undefined when single-book */
  secondaryFramework?: "IFRS" | "IFRS_SME";
  naicsCode?: string;
}

export type FundCapabilityKey =
  | "nav-daily"
  | "nav-periodic"
  | "capital-account-waterfall"
  | "fair-value-hierarchy"
  | "expense-recognition"
  | "liability-equity-classification"
  | "form-n-csr"
  | "form-pf"
  | "rule-6c-11-etf-basket"
  | "3c1-exemption"
  | "3c7-exemption"
  | "investor-lock-up"
  | "side-pocket-allocation";

export interface FundEntityRef {
  entityId: string;
  companyId: string;
  subSegment: FundAccountingSubSegment;
  context: FundAccountingPanelContext;
}
