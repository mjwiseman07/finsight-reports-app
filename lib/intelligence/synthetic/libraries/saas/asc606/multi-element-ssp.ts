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

export const MODULE_HANDLES = ["ASC.606-10-32-28", "ASC.606-10-32-32", "ASC.606-10-32-33"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function allocateHybridSSP(ctx: { containsSaaSARRData?: boolean }, input: { residualOnly?: boolean; observable?: number; adjustedMarket?: number }) {
  assertContainsSaaSARRData(ctx);
  if (input.residualOnly && (input.observable || input.adjustedMarket)) {
    throw SaasViolation("SAAS_SSP_RESIDUAL_ABUSE", "Residual SSP abused when higher hierarchy feasible");
  }
  if (input.observable) return { method: "observable", amount: input.observable };
  if (input.residualOnly) return { method: "residual", amount: 0 };
  throw SaasViolation("SAAS_SSP_HIERARCHY_FAIL", "SSP hierarchy not satisfied");
}
