/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["AICPA.TSC.SOC2.ProcessingIntegrity", "NIST.CSF"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateSoc2ProcessingIntegrity(input: { evaluated: boolean }) {
  if (!input.evaluated) throw SaasViolation("SAAS_SOC2_PROCESSINGINTEGRITY_MISSING", "SOC 2 ProcessingIntegrity TSC not evaluated — fail-closed");
  return { tsc: "ProcessingIntegrity", evaluated: true };
}
