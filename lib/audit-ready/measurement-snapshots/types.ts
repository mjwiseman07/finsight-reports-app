/**
 * CC-2A1 — provider-neutral measurement-input custody.
 * Sibling of accounting_syncs. Not Scorecard memory and not a new provenance chain.
 */

export const AR_AGING_SNAPSHOT_KIND = "ar_aging" as const;
export const AP_AGING_SNAPSHOT_KIND = "ap_aging" as const;
export const TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type MeasurementSnapshotKind =
  | typeof AR_AGING_SNAPSHOT_KIND
  | typeof AP_AGING_SNAPSHOT_KIND;

export type MeasurementEntityPayload = {
  entityRef: string;
  displayName: string | null;
  totalCents: number;
};

export type ArAgingCustomerPayload = MeasurementEntityPayload;

export type ApAgingVendorPayload = MeasurementEntityPayload;

export type MeasurementTrialBalanceLinePayload = {
  accountRef: string;
  accountName: string | null;
  debitCents: number | null;
  creditCents: number | null;
  netCents: number;
};

/** @deprecated Use MeasurementTrialBalanceLinePayload — same shape. */
export type ArAgingTrialBalanceLinePayload = MeasurementTrialBalanceLinePayload;

export type ArAgingMeasurementPayload = {
  currency: string | null;
  customers: ArAgingCustomerPayload[];
  subledgerTotalCents: number;
  trialBalance: MeasurementTrialBalanceLinePayload[];
};

export type ApAgingMeasurementPayload = {
  currency: string | null;
  vendors: ApAgingVendorPayload[];
  subledgerTotalCents: number;
  trialBalance: MeasurementTrialBalanceLinePayload[];
};

export type MeasurementSnapshotPayload =
  | ArAgingMeasurementPayload
  | ApAgingMeasurementPayload;

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

export type TieOutApMeasurementSnapshot = TieOutMeasurementSnapshotV1<
  typeof AP_AGING_SNAPSHOT_KIND,
  ApAgingMeasurementPayload
>;

export type MeasurementSnapshotHashBody = {
  schemaVersion: number;
  snapshotKind: MeasurementSnapshotKind;
  asOfDate: string;
  payload: MeasurementSnapshotPayload;
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
  COMBINED_AR_SNAPSHOT_PERSIST_FAILED:
    "measurement_snapshot_combined_ar_persist_failed",
  COMBINED_AP_SNAPSHOT_PERSIST_FAILED:
    "measurement_snapshot_combined_ap_persist_failed",
} as const;

export class MeasurementSnapshotError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MeasurementSnapshotError";
    this.code = code;
  }
}

/**
 * Combined AR+AP acquisition did not complete both snapshots.
 * AP is never CC-authoritative when this is thrown.
 */
export class CombinedAcquisitionPartialError extends MeasurementSnapshotError {
  accountingSyncId: string;
  arMeasurementSnapshot: TieOutArMeasurementSnapshot | null;
  apMeasurementSnapshot: TieOutApMeasurementSnapshot | null;

  constructor(args: {
    code: string;
    message: string;
    accountingSyncId: string;
    arMeasurementSnapshot?: TieOutArMeasurementSnapshot | null;
    apMeasurementSnapshot?: TieOutApMeasurementSnapshot | null;
  }) {
    super(args.code, args.message);
    this.name = "CombinedAcquisitionPartialError";
    this.accountingSyncId = args.accountingSyncId;
    this.arMeasurementSnapshot = args.arMeasurementSnapshot ?? null;
    this.apMeasurementSnapshot = args.apMeasurementSnapshot ?? null;
  }
}
