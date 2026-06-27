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

export const MODULE_HANDLES = ["ASC.340-40-25-1", "ASC.340-40-35-1"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateCommissionAmortization(ctx: { containsSaaSARRData?: boolean }, input: { contractTermOnly: boolean; expectedRenewals: number }) {
  assertContainsSaaSARRData(ctx);
  if (input.contractTermOnly && input.expectedRenewals > 0) {
    throw SaasViolation("SAAS_COMMISSION_TERM_ONLY", "Commission amortized over contract term only — renewals required");
  }
  return { amortPeriod: input.expectedRenewals > 0 ? "term-plus-renewals" : "term" };
}
