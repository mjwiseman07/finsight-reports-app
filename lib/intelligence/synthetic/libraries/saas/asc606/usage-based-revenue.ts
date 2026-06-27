/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.606-10-25-27", "ASC.606-10-25-28", "ASC.606-10-25-29"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);

  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateUsageBasedRevenue(ctx: { containsSaaSARRData?: boolean }, input: { usageMetered: boolean; overTimeMet: boolean }) {
  assertContainsSaaSARRData(ctx);

  if (input.usageMetered && !input.overTimeMet) throw SaasViolation("SAAS_USAGE_NO_OVER_TIME", "Usage-based without over-time criterion — fail-closed");
  return { recognized: input.usageMetered && input.overTimeMet };
}
