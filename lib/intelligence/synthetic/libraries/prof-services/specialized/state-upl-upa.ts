/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */

import { resolveProfServicesCitationHandle } from "../handles";
import { ProfServicesViolation } from "../errors";

export const MODULE_HANDLES = ["TX.GovCode.81.101", "CA.BPCode.6125", "NY.JudLaw.478", "TX.AccountancyAct"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateUplBoundary(input: { subSegment: string; licensedActivity: boolean }) {
  if ((input.subSegment === "L" || input.subSegment === "A") && !input.licensedActivity) {
    throw ProfServicesViolation("PS_UPL_BOUNDARY", "Activity outside licensure boundary");
  }
  return { licensed: input.licensedActivity };
}
