/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.606-10-25-14", "ASC.606-10-25-30"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateUsageStandReady(ctx: { containsSaaSARRData?: boolean }, input: { c1: boolean; c2: boolean; c3: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (!input.c1 || !input.c2 || !input.c3) {
    throw SaasViolation("SAAS_USAGE_STAND_READY_FAIL", "Usage stand-ready requires all 3 conditions");
  }
  return { standReady: true };
}
