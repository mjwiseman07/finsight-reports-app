export const POC_PROGRESS_AUDIT_CHANNEL_ID = "poc-progress-audit" as const;
export const POC_PROGRESS_AUDIT_EVIDENCE_VERSION = "CON.2.K-LOCK.0" as const;
export const POC_PROGRESS_AUDIT_RETENTION_YEARS = 7 as const;

export type POCProgressAuditOutcome =
  | "progress-measured"
  | "change-order-evaluated"
  | "claim-evaluated"
  | "retention-classified"
  | "uninstalled-materials-evaluated"
  | "jv-consolidation-evaluated"
  | "framework-switched"
  | "over-time-criteria-evaluated"
  | "sub-segment-classified"
  | "rejected-escalation";

export interface POCProgressAuditEntry {
  channelId: typeof POC_PROGRESS_AUDIT_CHANNEL_ID;
  emittedAt: string;
  outcome: POCProgressAuditOutcome;
  evidence: Record<string, unknown>;
  containsConstructionContractData: true;
  evidenceVersion: typeof POC_PROGRESS_AUDIT_EVIDENCE_VERSION;
  retentionYears: typeof POC_PROGRESS_AUDIT_RETENTION_YEARS;
  previousHash?: string;
  entryHash?: string;
}
