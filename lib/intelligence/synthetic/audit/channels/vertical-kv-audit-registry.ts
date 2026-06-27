/**
 * LOCK-VC C3 — canonical vertical K-V audit channel inventory.
 */
export const VERTICAL_KV_AUDIT_CHANNEL_REGISTRY = [
  "revenue-recognition",
  "journal-entry-prep",
  "reconciliation",
  "variance-analysis",
  "close-management",
  "financial-statements",
  "audit-support",
  "fund-accounting-audit",
  "dcaa-audit",
  "construction-contract-audit",
  "restricted-net-asset-audit",
  "manufacturing-cost-audit",
] as const;

export type VerticalKvAuditChannel = (typeof VERTICAL_KV_AUDIT_CHANNEL_REGISTRY)[number];

export const VERTICAL_KV_AUDIT_CHANNEL_COUNT = VERTICAL_KV_AUDIT_CHANNEL_REGISTRY.length;
