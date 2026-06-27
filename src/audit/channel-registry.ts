export type AuditChannel =
  | "revenue-recognition"
  | "journal-entry-prep"
  | "reconciliation"
  | "variance-analysis"
  | "close-management"
  | "financial-statements"
  | "audit-support"
  | "fund-accounting-audit"
  | "dcaa-audit"
  | "construction-contract-audit"
  | "restricted-net-asset-audit";

export type MfgOnlyAuditChannel = "manufacturing-cost-audit";

export const AUDIT_CHANNEL_COUNT = 11;
export const MFG_AUDIT_CHANNEL_COUNT = 12;
