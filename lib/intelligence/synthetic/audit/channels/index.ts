/**
 * Audit channel registry — 11 channels after LOCK-NPO-1.
 */

export {
  DCAA_RATE_AUDIT_CHANNEL_ID,
  DCAA_RATE_AUDIT_EVIDENCE_VERSION,
  DCAA_RATE_AUDIT_RETENTION_YEARS,
  createDcaaRateAuditEvent,
} from "./dcaa-rate-audit";
export type {
  DcaaRateAuditEvent,
  DcaaRateAuditDecisionType,
  DcaaRateAuditOutcome,
} from "./dcaa-rate-audit";

export { pocProgressAuditChannel } from "./poc-progress-audit";
export * from "./poc-progress-audit";

export { engagementLetterAuditChannel } from "./engagement-letter-audit";
export * from "./engagement-letter-audit";

export { arrMrrAuditChannel } from "./arr-mrr-audit";
export * from "./arr-mrr-audit";

export { restrictedNetAssetAuditChannel } from "./restricted-net-asset-audit";
export * from "./restricted-net-asset-audit";

export const AUDIT_CHANNEL_REGISTRY = [
  "treatment-resolver-audit",
  "memory-framework-dimension",
  "escalation-audit",
  "panel-decision-audit",
  "org-edge-audit",
  "phi-access-audit",
  "dcaa-rate-audit",
  "poc-progress-audit",
  "engagement-letter-audit",
  "arr-mrr-audit",
  "restricted-net-asset-audit",
] as const;

export type RegisteredAuditChannel = (typeof AUDIT_CHANNEL_REGISTRY)[number];
export const AUDIT_CHANNEL_COUNT = AUDIT_CHANNEL_REGISTRY.length;

export function assertAuditChannelCount(expected: number): boolean {
  if (AUDIT_CHANNEL_COUNT !== expected) {
    throw new Error(`Expected ${expected} audit channels, got ${AUDIT_CHANNEL_COUNT}`);
  }
  return true;
}
