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

export const MODULE_HANDLES = ["ASC.606-10-25-27", "ASC.606-10-25-28", "ASC.606-10-25-29", "ASC.606-10-25-30"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

export function evaluateOverTimeCriteria(criteria: { c1: boolean; c2: boolean; c3: boolean }) {
  const pass = criteria.c1 || criteria.c2 || criteria.c3;
  if (!pass) {
    throw ConstructionViolation("CON_OVER_TIME_FAIL", "No ASC 606 over-time criterion met — fail-closed");
  }
  return { pass: true, method: "over-time" };
}
