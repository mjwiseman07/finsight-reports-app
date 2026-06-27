/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */

import { resolveProfServicesCitationHandle } from "../handles";
import { ProfServicesViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.340-40-25-1", "ASC.340-40-25-5", "ASC.340-40-35-1", "ASC.340-40-35-3", "ASC.340-40-35-6"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateSalesCommission(input: { capitalizable: boolean; expensed: boolean }) {
  if (input.expensed && input.capitalizable) {
    throw ProfServicesViolation("PS_COMMISSION_EXPENSED", "Sales commission expensed when ASC 340-40-25-1 capitalization met");
  }
  return { capitalized: input.capitalizable };
}
