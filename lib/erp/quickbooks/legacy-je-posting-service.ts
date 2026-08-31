/**
 * Compatibility boundary for pre-Patent-#6 journal-entry workflows.
 *
 * Production is always denied. Existing non-production workflows may continue
 * to use the legacy D2 poster while they are translated into governed
 * proposal/approval/execution custody. Application code must import this
 * service instead of the transport-capable legacy poster.
 */
import { qboJournalEntryPoster } from "./journal-entry-poster";
import type { IJournalEntryPoster, JEPostRequest, JEPostResult } from "../types";

export const LEGACY_PRODUCTION_JE_BLOCK_REASON =
  "governed_patent_6_custody_required";

export function isProductionQboEnvironment(
  environment = process.env.QB_ENVIRONMENT,
): boolean {
  return environment === "production";
}

function productionDenied(): JEPostResult {
  return {
    status: "rejected",
    attempt_id: "",
    reason: LEGACY_PRODUCTION_JE_BLOCK_REASON,
    details: {
      providerPostIssued: false,
      memoryWritten: false,
      requiredAuthority: "governed_patent_6_execution",
    },
  };
}

export const legacyJournalEntryPostingService: IJournalEntryPoster = {
  async post(request: JEPostRequest): Promise<JEPostResult> {
    if (isProductionQboEnvironment()) return productionDenied();
    return qboJournalEntryPoster.post(request);
  },

  async reverse(
    attemptId: string,
    reason: string,
    actorUserId: string,
  ): Promise<JEPostResult> {
    if (isProductionQboEnvironment()) return productionDenied();
    return qboJournalEntryPoster.reverse(attemptId, reason, actorUserId);
  },
};
