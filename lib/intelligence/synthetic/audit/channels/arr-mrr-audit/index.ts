import {
  ARR_MRR_AUDIT_CHANNEL_ID,
  ARR_MRR_AUDIT_EVIDENCE_VERSION,
  ARR_MRR_AUDIT_RETENTION_YEARS,
} from "./types";

export const arrMrrAuditChannel = {
  id: ARR_MRR_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: ARR_MRR_AUDIT_RETENTION_YEARS,
  evidenceVersion: ARR_MRR_AUDIT_EVIDENCE_VERSION,
  failClosed: true,
  hashChain: true,
} as const;

export * from "./types";
export * from "./writer";
export * from "./validator";
export * from "./redaction";
export * from "./pure-core";
export * from "./locked-citation-handles";
