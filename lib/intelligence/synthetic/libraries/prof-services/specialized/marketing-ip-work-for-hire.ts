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

export const MODULE_HANDLES = ["USC.17.101", "USC.17.201b", "USPTO.IPBasics", "DMCA.NoticeTakedown"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateWorkForHire(input: { subSegment: string; assignmentPresent: boolean }) {
  if (input.subSegment === "K" && !input.assignmentPresent) throw ProfServicesViolation("PS_WORK_FOR_HIRE", "Work-for-hire assignment required for K");
  return { assigned: input.assignmentPresent };
}
