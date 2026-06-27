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

export const MODULE_HANDLES = ["ABA.ModelRule.1.7", "ABA.ModelRule.1.8", "ABA.ModelRule.1.9", "ABA.ModelRule.1.10", "AICPA.ET.1.110", "AICPA.ET.1.200", "MCA.ConflictGuidance"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateCoi(input: { subSegment: "L" | "A" | "M" | "I" | "E" | "K"; conflictDisclosed: boolean }) {
  if (input.subSegment === "L" || input.subSegment === "A") {
    if (!input.conflictDisclosed) throw ProfServicesViolation("PS_COI_STRUCTURAL", "COI disclosure required for L+A");
  }
  if (input.subSegment === "M" && !input.conflictDisclosed) {
    throw ProfServicesViolation("PS_COI_CONDITIONAL", "COI conditional fail for M");
  }
  return { allowed: true };
}
