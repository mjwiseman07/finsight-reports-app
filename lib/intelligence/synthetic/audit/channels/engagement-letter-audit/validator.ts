import type { EngagementLetterAuditEntry } from "./types";
import { ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID, ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION } from "./types";

export function validateEngagementLetterAuditEntry(entry: EngagementLetterAuditEntry): void {
  if (entry.channelId !== ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_INVALID_CHANNEL");
  }
  if (entry.evidenceVersion !== ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_INVALID_EVIDENCE_VERSION");
  }
  if (entry.containsProfessionalEngagementData !== true) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_DOCTRINE_REQUIRED");
  }
  if (!entry.outcome) {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_OUTCOME_REQUIRED");
  }
}
