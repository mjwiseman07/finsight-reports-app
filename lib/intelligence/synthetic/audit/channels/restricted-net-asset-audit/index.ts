export const RESTRICTED_NET_ASSET_AUDIT_CHANNEL_ID = "restricted-net-asset-audit" as const;
export const RESTRICTED_NET_ASSET_AUDIT_EVIDENCE_VERSION = "NPO.1.K-LOCK.0" as const;
export const RESTRICTED_NET_ASSET_AUDIT_RETENTION_YEARS = 7 as const;

export const restrictedNetAssetAuditChannel = {
  id: RESTRICTED_NET_ASSET_AUDIT_CHANNEL_ID,
  defaultOn: true,
  retentionYears: RESTRICTED_NET_ASSET_AUDIT_RETENTION_YEARS,
  evidenceVersion: RESTRICTED_NET_ASSET_AUDIT_EVIDENCE_VERSION,
  failClosed: true,
  hashChain: true,
  status: "reserved-for-NPO-2" as const,
} as const;
