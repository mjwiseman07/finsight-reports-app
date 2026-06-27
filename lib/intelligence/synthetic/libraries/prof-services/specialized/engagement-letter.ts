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

export const MODULE_HANDLES = ["ABA.ModelRule.1.5", "AICPA.ET.1.310", "ABA.ModelRule.1.7", "ABA.ModelRule.1.8"] as const;

export function resolveModuleHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export const ENGAGEMENT_LETTER_REQUIRED_FIELDS = ["parties", "scope", "fees", "conflicts", "termination", "signatures"] as const;

export function validateEngagementLetter(ctx: { containsProfessionalEngagementData?: boolean }, input: { subSegment: "L" | "A" | "M" | "I" | "E" | "K"; fieldsPresent: string[] }) {
  assertContainsProfessionalEngagementData(ctx);

  if ((input.subSegment === "L" || input.subSegment === "A") && input.fieldsPresent.length < 3) {
    throw ProfServicesViolation("PS_ENGAGEMENT_LETTER_MISSING", "Engagement letter required fields missing for L+A");
  }
  return { valid: true };
}
