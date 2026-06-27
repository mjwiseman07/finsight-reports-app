/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["SaaS.Metrics.LTVCAC"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);

  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function computeLtvCac(ctx: { containsSaaSARRData?: boolean }, input: { ltv: number; cac: number }) {
  assertContainsSaaSARRData(ctx);

  return { ratio: input.ltv / Math.max(input.cac, 1) };
}
