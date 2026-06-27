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

export const MODULE_HANDLES = ["ASC.606-10-32-5", "ASC.606-10-32-6", "ASC.606-10-32-11", "ASC.606-10-32-12", "ASC.606-10-32-14", "ASC.606-10-32-25"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateContingentFee(input: { probable: boolean; constrained: boolean; engagementLevel: boolean }) {
  if (!input.engagementLevel) throw ProfServicesViolation("PS_VC_NOT_ENGAGEMENT_LEVEL", "Variable consideration must be engagement-level");
  if (!input.constrained) throw ProfServicesViolation("PS_VC_CONSTRAINT_BYPASS", "Constraint mandatory — fail-closed");
  return { recognized: input.probable && input.constrained };
}
