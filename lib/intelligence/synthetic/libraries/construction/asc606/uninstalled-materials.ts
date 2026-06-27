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

export const MODULE_HANDLES = ["ASC.606-10-25-23B", "ASC.606-10-25-35"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveConstructionCitationHandle(id));
}

export function evaluateUninstalledMaterialsGate(input: {
  isCustomerOwned: boolean;
  costEqualsSellingPrice: boolean;
  notCustomForContract: boolean;
}) {
  const excluded = input.isCustomerOwned && input.costEqualsSellingPrice && input.notCustomForContract;
  if (excluded) {
    throw ConstructionViolation("CON_UNINSTALLED_EXCLUDED", "Uninstalled materials excluded from POC — 3-condition gate");
  }
  return { includedInPoc: true };
}
