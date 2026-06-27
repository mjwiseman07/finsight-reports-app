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

export const MODULE_HANDLES = ["ASC.606-10-25-27", "ASC.606-10-25-28", "ASC.606-10-25-29", "ASC.606-10-25-30"] as const;

export function resolveModuleHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateOverTimeCriteria(ctx: { containsProfessionalEngagementData?: boolean }, criteria: { c1: boolean; c2: boolean; c3: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  const pass = criteria.c1 || criteria.c2 || criteria.c3;
  if (!pass) throw ProfServicesViolation("PS_OVER_TIME_FAIL", "No over-time criterion met — fail-closed");
  return { pass: true };
}
