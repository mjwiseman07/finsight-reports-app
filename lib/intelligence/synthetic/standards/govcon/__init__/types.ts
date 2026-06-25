/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * Local-only GovCon/DCAA types — NOT a global standards types module (GAP-2=A).
 */

export type GovConSubSegmentId = "C" | "N" | "S" | "R" | "F" | "T";

export type GovConDoctrineFlag = "containsGovernmentContractData";

export type GovConCitationLibrary =
  | "FAR_PART_31"
  | "CAS"
  | "DCAA"
  | "DISCLOSURES"
  | "BENCHMARKS";

export interface GovConCitationHandle {
  handleId: string;
  library: GovConCitationLibrary;
  url: string;
  title?: string;
}

export interface GovConSubSegmentKernel {
  subSegmentId: GovConSubSegmentId;
  description: string;
  applicableFARSubparts: readonly string[];
  applicableCASStandards: readonly string[];
  applicableDFARS: readonly string[];
}

export interface ExecCompCapResolution {
  calendarYear: number;
  amount: number;
  confirmed: boolean;
  escalationAudits: string[];
}

export interface GovConEscalationAudit {
  channel: "escalation-audit";
  code: string;
  message: string;
}
