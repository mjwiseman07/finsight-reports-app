/**
 * CC-2A1 — provider-neutral measurement-input custody.
 * Sibling of accounting_syncs. Not Scorecard memory and not a new provenance chain.
 */

export const AR_AGING_SNAPSHOT_KIND = "ar_aging" as const;
export const TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type MeasurementSnapshotKind = typeof AR_AGING_SNAPSHOT_KIND;

export type ArAgingCustomerPayload = {
  entityRef: string;
  displayName: string | null;
  totalCents: number;
};

export type ArAgingTrialBalanceLinePayload = {
  accountRef: string;
  accountName: string | null;
  debitCents: number | null;
  creditCents: number | null;
  netCents: number;
};

export type ArAgingMeasurementPayload = {
  currency: string | null;
  customers: ArAgingCustomerPayload[];
  subledgerTotalCents: number;
  trialBalance: ArAgingTrialBalanceLinePayload[];
};

export type MeasurementSourceRequestIds = {
  agingIntuitTid?: string | null;
  trialBalanceIntuitTid?: string | null;
  agingReportUrl?: string | null;
  trialBalanceReportUrl?: string | null;
};

export type TieOutMeasurementSnapshotV1<
  Kind extends MeasurementSnapshotKind,
  Payload,
> = {
  schemaVersion: typeof TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION;
  accountingSyncId: string;
  accountingConnectionId: string;
  companyId: string;
  provider: string;
  tenantOrRealmId: string;
  snapshotKind: Kind;
  asOfDate: string;
  capturedAt: string;
  payloadHash: string;
  sourceRequestIds: MeasurementSourceRequestIds;
  payload: Payload;
};

export type TieOutArMeasurementSnapshot = TieOutMeasurementSnapshotV1<
  typeof AR_AGING_SNAPSHOT_KIND,
  ArAgingMeasurementPayload
>;

export type MeasurementSnapshotHashBody = {
  schemaVersion: number;
  snapshotKind: MeasurementSnapshotKind;
  asOfDate: string;
  payload: ArAgingMeasurementPayload;
};

export type AccountingSyncForArSnapshot = {
  id: string;
  company_id: string;
  connection_id: string;
  source_system: string;
  tenant_id: string;
  report_period_end: string;
  validation_status: string;
};

export const MEASUREMENT_SNAPSHOT_ERROR = {
  KIND_INVALID: "measurement_snapshot_kind_invalid",
  SCHEMA_UNSUPPORTED: "measurement_snapshot_schema_unsupported",
  SYNC_ID_MISSING: "measurement_snapshot_sync_id_missing",
  AS_OF_MISMATCH: "measurement_snapshot_as_of_mismatch",
  CUSTODY_MISMATCH: "measurement_snapshot_custody_mismatch",
  HASH_MISMATCH: "measurement_snapshot_hash_mismatch",
  PAYLOAD_INVALID: "measurement_snapshot_payload_invalid",
  SECRETS_FORBIDDEN: "measurement_snapshot_secrets_forbidden",
  IMMUTABLE_CONFLICT: "measurement_snapshot_immutable_conflict",
  SYNC_UNAVAILABLE: "measurement_snapshot_accounting_sync_unavailable",
  SYNC_NOT_SUCCESS: "measurement_snapshot_accounting_sync_not_success",
  SYNC_COMPANY_MISSING: "measurement_snapshot_accounting_sync_company_missing",
  SYNC_PERIOD_MISMATCH: "measurement_snapshot_accounting_sync_period_mismatch",
  PERSIST_FAILED: "measurement_snapshot_persist_failed",
  AUTHORITATIVE_REQUIRED: "measurement_snapshot_authoritative_required",
  PREEXISTING_SYNC_NOT_AUTHORITY: "measurement_snapshot_preexisting_sync_not_authority",
  CORE_STATEMENTS_MISSING: "measurement_snapshot_core_statements_missing",
  PROVIDER_UNSUPPORTED: "measurement_snapshot_provider_unsupported",
} as const;

export class MeasurementSnapshotError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MeasurementSnapshotError";
    this.code = code;
  }
}
