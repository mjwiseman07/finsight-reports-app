/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * HC-2 basis contracts — sub-segments H/P/A/S/M/B/D.
 * Citation: ASC_606_HEALTHCARE, ASC_954_HEALTHCARE_ENTITIES.
 */

import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";

/** H=Hospital, P=Physician, A=ASC, S=SNF/LTAC, M=Home Health, B=Behavioral, D=Dental */
export type HealthcareSubSegment = "H" | "P" | "A" | "S" | "M" | "B" | "D";

export interface HealthcarePanelContext {
  companyId: string;
  entityId?: string;
  tenantId: string;
  reportingBasis: ReportingBasis;
  subSegment: HealthcareSubSegment;
  primaryFramework: "US_GAAP" | "IFRS" | "IFRS_SME";
  secondaryFramework?: "IFRS" | "IFRS_SME";
  /** Explicit config flag — never infer 501(r) from tax status */
  nonprofitHospital501r?: boolean;
  /** 340B eligibility at entity level */
  eligible340b?: boolean;
}

export type HealthcareCapabilityKey =
  | "net-revenue-recognition"
  | "contractual-allowances"
  | "charity-care"
  | "bad-debt"
  | "ppd"
  | "alos"
  | "cmi"
  | "occupancy"
  | "rvus"
  | "visits-per-day"
  | "asc-bundled-rate"
  | "per-episode-payment"
  | "dnfb"
  | "ar-days"
  | "denial-rate"
  | "clean-claim-rate"
  | "disclosures-npsr"
  | "340b-pricing"
  | "501r-charity-care"
  | "part-2-confidentiality";

export interface PhiAccessMetadata {
  tenantId: string;
  classification: "phi" | "part-2" | "non-phi";
  accessReason: string;
  capabilityKey: HealthcareCapabilityKey;
  accessorId: string;
  /** Structural token only — never raw PHI */
  payloadToken: string;
}
