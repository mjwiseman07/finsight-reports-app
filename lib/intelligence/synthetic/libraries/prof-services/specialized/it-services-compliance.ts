/**
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";

import { resolveProfServicesCitationHandle } from "../handles";
import { ProfServicesViolation } from "../errors";

export const MODULE_HANDLES = ["AICPA.TSC.SOC1", "AICPA.TSC.SOC2", "HIPAA.45CFR164.504e", "GDPR.Art28"] as const;

export function resolveModuleHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateItServicesStack(ctx: { containsProfessionalEngagementData?: boolean }, input: { subSegment: string; socEvaluated: boolean; baaEvaluated: boolean; gdprEvaluated: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  if (input.subSegment === "I" && (!input.socEvaluated || !input.baaEvaluated || !input.gdprEvaluated)) {
    throw ProfServicesViolation("PS_IT_STACK_INCOMPLETE", "SOC 1/2 + HIPAA BAA + GDPR Art 28 required for I");
  }
  return { compliant: true };
}
