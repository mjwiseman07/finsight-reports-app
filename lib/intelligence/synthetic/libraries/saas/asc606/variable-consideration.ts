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

export const MODULE_HANDLES = ["ASC.606-10-32-5", "ASC.606-10-32-6"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateVariableConsideration(ctx: { containsSaaSARRData?: boolean }, input: { constrained: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (!input.constrained) throw SaasViolation("SAAS_VC_CONSTRAINT_BYPASS", "Variable consideration constraint required");
  return { constrained: true };
}
