import {
  POC_PROGRESS_AUDIT_CHANNEL_ID,
  POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
  POC_PROGRESS_AUDIT_RETENTION_YEARS,
} from "./types";

export const pocProgressAuditChannel = {
  id: POC_PROGRESS_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: POC_PROGRESS_AUDIT_RETENTION_YEARS,
  evidenceVersion: POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
  failClosed: true,
  hashChain: true,
} as const;

export * from "./types";
export * from "./writer";
export * from "./validator";
export * from "./redaction";
export * from "./pure-core";
export * from "./locked-citation-handles";
