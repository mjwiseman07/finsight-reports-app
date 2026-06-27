/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver)
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../../handles";
import { SaasViolation } from "../../errors";

export const MODULE_HANDLES = ["SaaS.Metrics.ARR", "SaaS.Metrics.MRR", "ASC.606-10-25-14"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

import { assertContainsSaaSARRData } from "../../doctrine/flags/contains-saas-arr-data";

export function computeArr(ctx: { containsSaaSARRData?: boolean }, input: { mrr: number }) {
  assertContainsSaaSARRData(ctx);
  return { arr: input.mrr * 12 };
}
