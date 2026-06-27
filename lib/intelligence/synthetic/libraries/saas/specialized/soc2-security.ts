/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["AICPA.TSC.SOC2.Security", "NIST.CSF"] as const;

export function resolveModuleHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);

  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateSoc2Security(ctx: { containsSaaSARRData?: boolean }, input: { evaluated: boolean }) {
  assertContainsSaaSARRData(ctx);

  if (!input.evaluated) throw SaasViolation("SAAS_SOC2_SECURITY_MISSING", "SOC 2 Security TSC not evaluated — fail-closed");
  return { tsc: "Security", evaluated: true };
}
