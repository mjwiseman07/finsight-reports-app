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

export const MODULE_HANDLES = ["AICPA.ET.1.200.001", "SEC.Rule.2-01c", "PCAOB.Rule.3520"] as const;

export function resolveModuleHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateIndependence(ctx: { containsProfessionalEngagementData?: boolean }, input: { subSegment: string; independent: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  if (input.subSegment === "A" && !input.independent) throw ProfServicesViolation("PS_INDEPENDENCE_FAIL", "AICPA independence required for A");
  return { independent: input.independent };
}
