/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

// ONLY available to unincorporated construction/extractive JVs — structural lockout enforced in CON-2
import { resolveConstructionCitationHandle } from "../handles";
import { ConstructionViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.810-10-15-14", "ASC.810-10-25-8", "ASC.810-10-25-38", "ASC.810-30-45-1", "ASC.323-10-25-1", "ASC.323-10-35-4"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

export function assertProportionateConsolidationLockout(input: {
  entityType: "incorporated" | "unincorporated";
  method: "equity" | "proportionate";
}) {
  if (input.method === "proportionate" && input.entityType === "incorporated") {
    throw ConstructionViolation(
      "CON_JV_PROPORTIONATE_LOCKOUT",
      "ASC 810-30-45-1 proportionate consolidation ONLY for unincorporated construction/extractive JVs",
    );
  }
  return { allowed: true };
}
