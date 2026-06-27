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

export const MODULE_HANDLES = ["ASC.606-10-32-28", "ASC.606-10-32-29", "ASC.606-10-32-31", "ASC.606-10-32-32", "ASC.606-10-32-33", "ASC.606-10-32-34"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function allocateMultiElement(input: { observable?: number; adjustedMarket?: number; expectedCost?: number; residualOnly?: boolean }) {
  if (input.residualOnly && (input.observable || input.adjustedMarket || input.expectedCost)) {
    throw ProfServicesViolation("PS_SSP_RESIDUAL_ABUSE", "Residual used when higher hierarchy SSP feasible");
  }
  if (input.observable) return { method: "observable", amount: input.observable };
  if (input.adjustedMarket) return { method: "adjusted-market", amount: input.adjustedMarket };
  if (input.expectedCost) return { method: "expected-cost", amount: input.expectedCost };
  if (input.residualOnly) return { method: "residual", amount: 0 };
  throw ProfServicesViolation("PS_SSP_HIERARCHY_FAIL", "SSP hierarchy not satisfied");
}
