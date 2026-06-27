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

export const MODULE_HANDLES = ["NCEES.ModelRules.240.15", "TX.PE.Statute", "CA.PE.Statute", "FL.PE.Statute", "NY.PE.Statute"] as const;

export function resolveModuleHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function assertPeSealPresent(ctx: { containsProfessionalEngagementData?: boolean }, input: { subSegment: string; sealPresent: boolean; deliverableRequiresSeal: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  if (input.subSegment === "E" && input.deliverableRequiresSeal && !input.sealPresent) {
    throw ProfServicesViolation("PS_PE_SEAL_ABSENT", "PE seal required for E deliverable");
  }
  return { sealed: input.sealPresent };
}
