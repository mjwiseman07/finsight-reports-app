/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

export type ConstructionCitationLibrary =
  | "ASC_606_340"
  | "ASC_842"
  | "SPECIALIZED"
  | "IFRS"
  | "BENCHMARKS"
  | "FEDERAL_STATUTES";

export interface ConstructionCitationHandle {
  handleId: string;
  library: ConstructionCitationLibrary;
  url: string;
}

export type ConstructionSubSegmentId = "G" | "S" | "R" | "C" | "H" | "D";

export interface ConstructionSubSegmentKernel {
  subSegmentId: ConstructionSubSegmentId;
  name: string;
  frameworks: ("US_GAAP" | "IFRS")[];
  overTimeDefault: boolean;
}
