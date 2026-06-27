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

export const MODULE_HANDLES = ["ASC.606-10-25-10", "ASC.606-10-25-12", "ASC.606-10-25-13"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function routeSaasContractModification(ctx: { containsSaaSARRData?: boolean }, input: { separateContract: boolean; remainingDistinct: boolean; saasContext: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (!input.saasContext && input.separateContract) {
    throw SaasViolation("SAAS_MOD_MISROUTED", "SaaS contract mod misrouted outside SaaS context");
  }
  if (input.separateContract) return { path: "separate-contract" };
  if (input.remainingDistinct) return { path: "prospective" };
  return { path: "cumulative-catch-up" };
}
