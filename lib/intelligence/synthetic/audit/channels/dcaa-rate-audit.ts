/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * 7th audit channel — dcaa-rate-audit (LOCK-GC-2).
 * Default-ON all GC-2 modules. Retention 7 years (HIPAA parity).
 */

export const DCAA_RATE_AUDIT_CHANNEL_ID = "dcaa-rate-audit" as const;
export const DCAA_RATE_AUDIT_EVIDENCE_VERSION = "GC.2.K-LOCK.0" as const;
export const DCAA_RATE_AUDIT_RETENTION_YEARS = 7 as const;

export type DcaaRateAuditDecisionType =
  | "rate-resolution"
  | "fpra-to-pbr-transition"
  | "pbr-to-final-transition"
  | "final-to-ics-reconciliation"
  | "exec-comp-cap-check"
  | "maar6-timekeeping-check"
  | "far-31-205-allowability"
  | "cas-application";

export type DcaaRateAuditOutcome =
  | "allowed"
  | "rejected-escalation"
  | "rejected-structural";

export interface DcaaRateAuditEvent {
  channelId: typeof DCAA_RATE_AUDIT_CHANNEL_ID;
  emittedAt: string;
  subSegmentId: "C" | "N" | "S" | "R" | "F" | "T";
  decisionType: DcaaRateAuditDecisionType;
  evidence: Record<string, unknown>;
  outcome: DcaaRateAuditOutcome;
  handleId: string;
  containsGovernmentContractData: true;
  evidenceVersion: typeof DCAA_RATE_AUDIT_EVIDENCE_VERSION;
  retentionPolicyYears: typeof DCAA_RATE_AUDIT_RETENTION_YEARS;
}

export function createDcaaRateAuditEvent(
  partial: Omit<
    DcaaRateAuditEvent,
    | "channelId"
    | "containsGovernmentContractData"
    | "evidenceVersion"
    | "retentionPolicyYears"
    | "emittedAt"
  > & { emittedAt?: string },
): DcaaRateAuditEvent {
  return {
    channelId: DCAA_RATE_AUDIT_CHANNEL_ID,
    emittedAt: partial.emittedAt ?? new Date().toISOString(),
    subSegmentId: partial.subSegmentId,
    decisionType: partial.decisionType,
    evidence: partial.evidence,
    outcome: partial.outcome,
    handleId: partial.handleId,
    containsGovernmentContractData: true,
    evidenceVersion: DCAA_RATE_AUDIT_EVIDENCE_VERSION,
    retentionPolicyYears: DCAA_RATE_AUDIT_RETENTION_YEARS,
  };
}
