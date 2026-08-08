/**
 * QBO Journal Entry Poster — canary switch (WBP W1c.3).
 *
 * `WRITE_BOUNDARY_ENABLED !== "true"` (default) → verbatim Q7 legacy path.
 * `WRITE_BOUNDARY_ENABLED === "true"` → delegate to QuickBooksWriteProvider,
 *   back-write je_posting_audit + posted_je memory for parity, emit patented
 *   pilot_lifecycle_events chain.
 *
 * Public signature UNCHANGED. No API-route change required.
 */
import type {
  IJournalEntryPoster,
  JEPostRequest,
  JEPostResult,
} from "@/lib/erp/types";
import { legacyQboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster.legacy";

function writeBoundaryEnabled(): boolean {
  return process.env.WRITE_BOUNDARY_ENABLED === "true";
}

export const qboJournalEntryPoster: IJournalEntryPoster = {
  async post(req: JEPostRequest): Promise<JEPostResult> {
    if (!writeBoundaryEnabled()) return legacyQboJournalEntryPoster.post(req);
    const { postViaWriteBoundary } = await import(
      "@/lib/erp/quickbooks/journal-entry-poster.wb-delegate"
    );
    return postViaWriteBoundary(req);
  },

  async reverse(attemptId, reason, actorUserId): Promise<JEPostResult> {
    if (!writeBoundaryEnabled()) {
      return legacyQboJournalEntryPoster.reverse(attemptId, reason, actorUserId);
    }
    const { reverseViaWriteBoundary } = await import(
      "@/lib/erp/quickbooks/journal-entry-poster.wb-delegate"
    );
    return reverseViaWriteBoundary(attemptId, reason, actorUserId);
  },
};
