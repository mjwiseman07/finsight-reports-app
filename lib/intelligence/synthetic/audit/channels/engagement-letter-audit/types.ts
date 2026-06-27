export const ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID = "engagement-letter-audit" as const;
export const ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION = "PS.2.K-LOCK.0" as const;
export const ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS = 7 as const;

export type EngagementLetterAuditOutcome =
  | "engagement-letter-evaluated"
  | "engagement-letter-required-fields-validated"
  | "sub-segment-classified"
  | "framework-switched"
  | "over-time-criteria-evaluated"
  | "retainer-series-evaluated"
  | "variable-consideration-evaluated"
  | "ssp-hierarchy-evaluated"
  | "principal-vs-agent-evaluated"
  | "pe-seal-gate-evaluated"
  | "coi-registry-evaluated"
  | "independence-gate-evaluated"
  | "it-services-controls-evaluated"
  | "work-for-hire-evaluated"
  | "upl-boundary-evaluated"
  | "ias38-capitalization-evaluated"
  | "ias37-onerous-evaluated"
  | "ifrs-constraint-evaluated"
  | "contract-mod-evaluated"
  | "wip-unbilled-evaluated"
  | "backlog-evaluated"
  | "progress-method-evaluated"
  | "contingent-success-evaluated"
  | "contract-cost-evaluated"
  | "handle-whitelist-validated"
  | "rejected-escalation";

export interface EngagementLetterAuditEntry {
  channelId: typeof ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID;
  emittedAt: string;
  outcome: EngagementLetterAuditOutcome;
  evidence: Record<string, unknown>;
  containsProfessionalEngagementData: true;
  evidenceVersion: typeof ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION;
  retentionYears: typeof ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS;
  previousHash?: string;
  entryHash?: string;
}
