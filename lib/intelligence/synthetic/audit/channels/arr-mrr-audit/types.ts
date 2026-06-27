export const ARR_MRR_AUDIT_CHANNEL_ID = "arr-mrr-audit" as const;
export const ARR_MRR_AUDIT_EVIDENCE_VERSION = "SAAS.2.K-LOCK.0" as const;
export const ARR_MRR_AUDIT_RETENTION_YEARS = 7 as const;

export type ArrMrrAuditOutcome =
  | "commission-expensed-no-justification"
  | "commission-amortization-period-mismatch"
  | "material-right-not-detected"
  | "ssp-residual-bypass"
  | "usage-stand-ready-misclassified"
  | "usage-measure-of-progress-misclassified"
  | "contract-mod-misroute"
  | "ramp-deal-no-bifurcation"
  | "hosting-distinct-from-license-failure"
  | "ifric-march-2019-bypass"
  | "ifric-april-2021-bypass"
  | "ias38-criterion-1-fail"
  | "ias38-criterion-2-fail"
  | "ias38-criterion-3-fail"
  | "ias38-criterion-4-fail"
  | "ias38-criterion-5-fail"
  | "ias38-criterion-6-fail"
  | "arr-fabrication"
  | "mrr-fabrication"
  | "nrr-fabrication"
  | "grr-fabrication"
  | "sub-segment-ambiguity"
  | "framework-cross-blend"
  | "soc2-tsc-cc-violation"
  | "soc2-tsc-availability-violation"
  | "soc2-tsc-confidentiality-violation"
  | "arr-recognized"
  | "mrr-recognized"
  | "nrr-computed"
  | "grr-computed"
  | "commission-capitalized"
  | "material-right-detected"
  | "ssp-hierarchy-applied"
  | "usage-classified-stand-ready"
  | "usage-classified-measure-of-progress"
  | "contract-mod-treated"
  | "ramp-deal-bifurcated"
  | "hosting-distinct-from-license"
  | "over-time-criterion-met"
  | "over-time-criterion-rejected"
  | "ifric-march-2019-applied"
  | "ifric-april-2021-applied"
  | "ias38-criterion-all-pass"
  | "framework-switched"
  | "sub-segment-classified"
  | "soc2-tsc-cc-asserted"
  | "soc2-tsc-availability-asserted"
  | "soc2-tsc-confidentiality-asserted"
  | "soc2-tsc-processing-integrity-asserted"
  | "soc2-tsc-privacy-asserted"
  | "vertical-saas-overlay-applied"
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
