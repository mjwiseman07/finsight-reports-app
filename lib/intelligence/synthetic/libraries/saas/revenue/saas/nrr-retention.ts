/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver)
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../../handles";
import { SaasViolation } from "../../errors";

export const MODULE_HANDLES = ["SaaS.Metrics.NRR", "SaaS.Metrics.GRR"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

import { assertContainsSaaSARRData } from "../../doctrine/flags/contains-saas-arr-data";

export function computeNrr(ctx: { containsSaaSARRData?: boolean }, input: { startingArr: number; endingArr: number; churn: number; expansion: number }) {
  assertContainsSaaSARRData(ctx);
  const nrr = ((input.startingArr - input.churn + input.expansion) / Math.max(input.startingArr, 1)) * 100;
  return { nrr, grr: ((input.startingArr - input.churn) / Math.max(input.startingArr, 1)) * 100 };
}
