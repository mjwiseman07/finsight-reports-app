/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

export const REASONABLENESS_SOURCE = "CA 5% / TX varies / FL tiered";
export const REASONABLENESS_RANGE = {"ca":5,"tx":"varies","fl":"tiered"};

export function getReasonablenessRange() {
  return { source: REASONABLENESS_SOURCE, range: REASONABLENESS_RANGE };
}
