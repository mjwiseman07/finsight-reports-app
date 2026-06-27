export const ARR_MRR_AUDIT_CHANNEL_ID = "arr-mrr-audit" as const;
export const ARR_MRR_AUDIT_EVIDENCE_VERSION = "SAAS.1.K-LOCK.0" as const;
export const ARR_MRR_AUDIT_RETENTION_YEARS = 7 as const;

export type ArrMrrAuditOutcome =
  | "arr-evaluated"
  | "mrr-evaluated"
  | "nrr-evaluated"
  | "rpo-evaluated"
  | "churn-evaluated"
  | "subscription-over-time-evaluated"
  | "hosting-license-classified"
  | "material-right-evaluated"
  | "commission-amortization-evaluated"
  | "ssp-hierarchy-evaluated"
  | "usage-stand-ready-evaluated"
  | "contract-mod-evaluated"
  | "ifrs-constraint-evaluated"
  | "ifric-apr-2021-evaluated"
  | "soc2-cc-evaluated"
  | "soc2-a-evaluated"
  | "soc2-c-evaluated"
  | "soc2-pi-evaluated"
  | "soc2-p-evaluated"
  | "framework-switched"
  | "sub-segment-classified"
  | "rule-of-40-evaluated"
  | "magic-number-evaluated"
  | "ltv-cac-evaluated"
  | "handle-whitelist-validated"
  | "rejected-escalation";

export interface ArrMrrAuditEntry {
  channelId: typeof ARR_MRR_AUDIT_CHANNEL_ID;
  emittedAt: string;
  outcome: ArrMrrAuditOutcome;
  evidence: Record<string, unknown>;
  containsSaaSARRData: true;
  evidenceVersion: typeof ARR_MRR_AUDIT_EVIDENCE_VERSION;
  retentionYears: typeof ARR_MRR_AUDIT_RETENTION_YEARS;
  previousHash?: string;
  entryHash?: string;
}
