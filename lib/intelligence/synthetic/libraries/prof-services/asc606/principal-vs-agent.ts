/**
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";

import { resolveProfServicesCitationHandle } from "../handles";
import { ProfServicesViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.606-10-55-36", "ASC.606-10-55-37", "ASC.606-10-55-38", "ASC.606-10-55-39", "ASC.606-10-55-40"] as const;

export function resolveModuleHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function classifyPrincipalVsAgent(ctx: { containsProfessionalEngagementData?: boolean }, input: { positiveControlEvidence: boolean; amount: number }) {
  assertContainsProfessionalEngagementData(ctx);

  if (!input.positiveControlEvidence) return { presentation: "net", amount: 0 };
  return { presentation: "gross", amount: input.amount };
}
