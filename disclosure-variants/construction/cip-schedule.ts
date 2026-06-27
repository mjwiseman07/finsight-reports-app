/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

export const DISCLOSURE_VARIANT = "cip-schedule";

export function buildDisclosureVariant() {
  return { variant: DISCLOSURE_VARIANT, framework: ["US_GAAP", "IFRS"] };
}
