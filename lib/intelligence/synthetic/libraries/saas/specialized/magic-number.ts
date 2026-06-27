/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["SaaS.Metrics.MagicNumber"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);

  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function computeMagicNumber(ctx: { containsSaaSARRData?: boolean }, input: { netNewArr: number; salesMarketingSpend: number }) {
  assertContainsSaaSARRData(ctx);

  return { magicNumber: input.netNewArr / Math.max(input.salesMarketingSpend, 1) };
}
