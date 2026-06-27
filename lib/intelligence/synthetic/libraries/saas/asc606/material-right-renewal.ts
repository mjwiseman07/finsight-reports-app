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

export const MODULE_HANDLES = ["IFRS15.B34-B35", "ASC.606-10-32-28"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateMaterialRight(ctx: { containsSaaSARRData?: boolean }, input: { renewalDiscountPct: number; sspReference: number }) {
  assertContainsSaaSARRData(ctx);
  const threshold = 0.10;
  if (input.renewalDiscountPct >= threshold) {
    throw SaasViolation("SAAS_MATERIAL_RIGHT_MISSED", "Material right at >=10% below SSP not recognized");
  }
  return { materialRight: false };
}
