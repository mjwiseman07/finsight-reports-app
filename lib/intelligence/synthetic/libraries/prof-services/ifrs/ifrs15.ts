/**
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";

// DIV-2: IFRS uses "highly probable" constraint threshold vs US GAAP "probable" — runtime enforcement in PS-2
import { resolveProfServicesCitationHandle } from "../handles";
import { ProfServicesViolation } from "../errors";
export const IFRS15_HANDLES = ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.Para56-58", "IFRS15.B14-B19", "EUR-Lex.2016R1905.IFRS15", "EUR-Lex.2023R1803.IFRS15"] as const;
export function resolveIfrs15Handles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);
 return IFRS15_HANDLES.map((h) => resolveProfServicesCitationHandle(h)); }
export function evaluateIfrsConstraint(ctx: { containsProfessionalEngagementData?: boolean }, input: { highlyProbable: boolean; usProbableOnly: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  if (input.usProbableOnly && !input.highlyProbable) {
    throw ProfServicesViolation("PS_IFRS_DIV2_CONSTRAINT", "IFRS highly-probable threshold required — not US probable");
  }
  return { constrained: true };
}
