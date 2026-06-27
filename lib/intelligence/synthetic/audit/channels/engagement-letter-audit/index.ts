import {
  ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
  ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
} from "./types";

export const engagementLetterAuditChannel = {
  id: ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
  evidenceVersion: ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
  failClosed: true,
  hashChain: true,
} as const;

export * from "./types";
export * from "./writer";
export * from "./validator";
export * from "./redaction";
export * from "./pure-core";
export * from "./locked-citation-handles";
