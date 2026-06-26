/**
 * Audit channel registry — 7 channels after LOCK-GC-2.
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

/** Prior 6 channels (HC-2 / 42.7) + dcaa-rate-audit */
export const AUDIT_CHANNEL_REGISTRY = [
  "treatment-resolver-audit",
  "memory-framework-dimension",
  "escalation-audit",
  "panel-decision-audit",
  "org-edge-audit",
  "phi-access-audit",
  "dcaa-rate-audit",
] as const;

export type RegisteredAuditChannel = (typeof AUDIT_CHANNEL_REGISTRY)[number];

export const AUDIT_CHANNEL_COUNT = AUDIT_CHANNEL_REGISTRY.length;

export function assertAuditChannelCount(expected: number): boolean {
  if (AUDIT_CHANNEL_COUNT !== expected) {
    throw new Error(`Expected ${expected} audit channels, got ${AUDIT_CHANNEL_COUNT}`);
  }
  return true;
}
