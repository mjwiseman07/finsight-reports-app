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

export const MODULE_HANDLES = ["ASC.360-10-35-17", "ASC.360-10-35-20", "ASC.360-10-35-21", "ASC.360-10-35-22", "ASC.360-10-35-37"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

export function evaluateCipImpairmentDelay(indicatorsPresent: boolean, testDelayed: boolean) {
  if (indicatorsPresent && testDelayed) {
    throw ConstructionViolation("CON_CIP_IMPAIRMENT_DELAY", "CIP impairment test delayed despite indicators");
  }
  return { testRequired: indicatorsPresent };
}
