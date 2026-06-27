/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

import { resolveConstructionCitationHandle } from "../handles";
import { ConstructionViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.460-10-25-1", "ASC.460-10-25-2", "ASC.460-10-50-4", "ASC.460-10-50-8"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

export function evaluateGuaranteeAtInception(fairValue: number | null) {
  if (fairValue === null || fairValue < 0) {
    throw ConstructionViolation("CON_GUARANTEE_INCEPTION", "Guarantee must be measured at inception");
  }
  return { recognized: fairValue };
}
