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

export const MODULE_HANDLES = ["ASC.606-10-25-10", "ASC.606-10-25-11", "ASC.606-10-25-12", "ASC.606-10-25-13"] as const;

export function resolveModuleHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function routeModification(ctx: { containsProfessionalEngagementData?: boolean }, input: { separateContract: boolean; remainingDistinct: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  if (input.separateContract) return { path: "separate-contract" };
  if (input.remainingDistinct) return { path: "prospective" };
  return { path: "cumulative-catch-up" };
}
