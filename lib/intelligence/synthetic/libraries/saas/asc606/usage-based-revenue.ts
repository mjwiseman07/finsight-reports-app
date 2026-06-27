/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.606-10-25-27", "ASC.606-10-25-28", "ASC.606-10-25-29"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateUsageBasedRevenue(input: { usageMetered: boolean; overTimeMet: boolean }) {
  if (input.usageMetered && !input.overTimeMet) throw SaasViolation("SAAS_USAGE_NO_OVER_TIME", "Usage-based without over-time criterion — fail-closed");
  return { recognized: input.usageMetered && input.overTimeMet };
}
