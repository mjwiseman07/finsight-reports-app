/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * GC-1 negative guard — 7th audit channel dcaa-rate-audit reserved for GC-2.
 */

export const DCAA_RATE_AUDIT_CHANNEL_ID = "dcaa-rate-audit";

export function assertNoSeventhChannelInGovCon(source: string): {
  pass: boolean;
  reason: string;
} {
  if (source.includes(DCAA_RATE_AUDIT_CHANNEL_ID)) {
    return {
      pass: false,
      reason: `${DCAA_RATE_AUDIT_CHANNEL_ID} must not exist in GC-1`,
    };
  }
  return { pass: true, reason: "7th channel not registered in GC-1" };
}
