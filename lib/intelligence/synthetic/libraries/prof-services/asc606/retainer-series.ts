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

export const MODULE_HANDLES = ["ASC.606-10-25-14", "ASC.606-10-25-15", "ASC.606-10-25-19", "ASC.606-10-25-20", "ASC.606-10-25-22"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveProfServicesCitationHandle(id));
}

export function evaluateRetainerSeries(input: { seriesOfDistinct: boolean; straightLineRequested: boolean }) {
  if (input.straightLineRequested && !input.seriesOfDistinct) {
    throw ProfServicesViolation("PS_RETAINER_NO_SERIES", "Retainer straight-line without series-of-distinct — fail-closed");
  }
  return { recognized: input.seriesOfDistinct };
}
