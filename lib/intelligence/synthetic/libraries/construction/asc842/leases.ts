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

export const MODULE_HANDLES = ["ASC.842-10-15-3", "ASC.842-10-15-9", "ASC.842-10-15-26", "ASC.842-10-15-28", "ASC.842-10-20", "ASC.842-10-25-1", "ASC.842-20-25-1", "ASC.842-20-25-2", "ASC.842-20-25-6", "ASC.842-30-25-1"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

export function evaluateShortTermException(termMonths: number, materialityThreshold: number) {
  if (termMonths <= 12 && materialityThreshold > 500000) {
    throw ConstructionViolation("CON_SHORT_TERM_ABUSE", "Short-term exception applied with material lease — fail-closed");
  }
  return { exempt: termMonths <= 12 };
}
