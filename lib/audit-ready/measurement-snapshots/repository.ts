import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { requireAuthoritativeBaselineSyncId } from "@/lib/audit-ready/tie-out/baseline-sync-custody";
import {
  AR_AGING_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type AccountingSyncForArSnapshot,
  type TieOutArMeasurementSnapshot,
} from "./types";
import { asIsoDate, validateArMeasurementSnapshot } from "./validate";

const TABLE = "accounting_measurement_snapshots";

type SnapshotRow = {
  id: string;
  accounting_sync_id: string;
  company_id: string;
  accounting_connection_id: string;
  provider: string;
  tenant_or_realm_id: string;
  snapshot_kind: string;
  as_of_date: string;
  schema_version: number;
  payload: TieOutArMeasurementSnapshot["payload"];
  payload_hash: string;
  source_request_ids: TieOutArMeasurementSnapshot["sourceRequestIds"];
  captured_at: string;
  created_at: string;
};

function rowToSnapshot(row: SnapshotRow): TieOutArMeasurementSnapshot {
  return {
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    accountingSyncId: row.accounting_sync_id,
    accountingConnectionId: row.accounting_connection_id,
    companyId: row.company_id,
    provider: row.provider,
    tenantOrRealmId: row.tenant_or_realm_id,
    snapshotKind: AR_AGING_SNAPSHOT_KIND,
    asOfDate: asIsoDate(row.as_of_date),
    capturedAt: row.captured_at,
    payloadHash: row.payload_hash,
    sourceRequestIds: row.source_request_ids ?? {},
    payload: row.payload,
  };
}

export async function loadAccountingSyncForArSnapshot(
  accountingSyncId: string,
): Promise<AccountingSyncForArSnapshot> {
  const id = requireAuthoritativeBaselineSyncId(accountingSyncId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounting_syncs")
    .select(
      "id, company_id, connection_id, source_system, tenant_id, report_period_end, validation_status",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_UNAVAILABLE,
      error.message,
    );
  }
  if (!data?.id) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_UNAVAILABLE,
      "accounting_syncs row was not found.",
    );
  }
  return {
    id: String(data.id),
    company_id: data.company_id == null ? "" : String(data.company_id),
    connection_id: String(data.connection_id || ""),
    source_system: String(data.source_system || ""),
    tenant_id: String(data.tenant_id || ""),
    report_period_end: asIsoDate(data.report_period_end),
    validation_status: String(data.validation_status || ""),
  };
}

/**
 * Existing SUCCESS accounting_syncs whose report_period_end equals asOfDate.
 * Does not create a sync row. Period mismatch fails closed.
 */
export async function requirePeriodMatchedAccountingSyncForAr(args: {
  accountingSyncId: string;
  asOfDate: string;
  companyId: string;
  accountingConnectionId: string;
  provider: string;
  tenantOrRealmId: string;
}): Promise<AccountingSyncForArSnapshot> {
  const sync = await loadAccountingSyncForArSnapshot(args.accountingSyncId);
  if (sync.validation_status !== "SUCCESS") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_NOT_SUCCESS,
      "AR measurement snapshots require a SUCCESS accounting_syncs row.",
    );
  }
  if (!sync.company_id) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_COMPANY_MISSING,
      "AR measurement snapshots require accounting_syncs.company_id.",
    );
  }
  if (asIsoDate(sync.report_period_end) !== asIsoDate(args.asOfDate)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_PERIOD_MISMATCH,
      "accounting_syncs.report_period_end must equal the AR asOfDate. Scorecard month is not inferred.",
    );
  }
  if (
    sync.company_id !== args.companyId ||
    sync.connection_id !== args.accountingConnectionId ||
    sync.source_system !== args.provider ||
    sync.tenant_id !== args.tenantOrRealmId
  ) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "accounting_syncs company/connection/provider/realm does not match AR capture custody.",
    );
  }
  return sync;
}

export async function loadArMeasurementSnapshot(args: {
  accountingSyncId: string;
  asOfDate: string;
}): Promise<TieOutArMeasurementSnapshot | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, accounting_sync_id, company_id, accounting_connection_id, provider, tenant_or_realm_id, snapshot_kind, as_of_date, schema_version, payload, payload_hash, source_request_ids, captured_at, created_at",
    )
    .eq("accounting_sync_id", args.accountingSyncId)
    .eq("snapshot_kind", AR_AGING_SNAPSHOT_KIND)
    .eq("as_of_date", asIsoDate(args.asOfDate))
    .maybeSingle();
  if (error) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PERSIST_FAILED,
      error.message,
    );
  }
  if (!data) return null;
  return rowToSnapshot(data as SnapshotRow);
}

/**
 * Insert-only. Same unique coordinates + same hash → reuse.
 * Same unique coordinates + different hash → fail closed. Never UPDATE.
 */
export async function persistArMeasurementSnapshot(
  snapshot: TieOutArMeasurementSnapshot,
): Promise<{ snapshot: TieOutArMeasurementSnapshot; reused: boolean }> {
  const validated = validateArMeasurementSnapshot(snapshot, {
    asOfDate: snapshot.asOfDate,
    companyId: snapshot.companyId,
    accountingConnectionId: snapshot.accountingConnectionId,
    provider: snapshot.provider,
    tenantOrRealmId: snapshot.tenantOrRealmId,
    accountingSyncId: snapshot.accountingSyncId,
  });
  const existing = await loadArMeasurementSnapshot({
    accountingSyncId: validated.accountingSyncId,
    asOfDate: validated.asOfDate,
  });
  if (existing) {
    if (existing.payloadHash !== validated.payloadHash) {
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.IMMUTABLE_CONFLICT,
        "An AR measurement snapshot already exists for this sync/kind/as-of with a different payload hash.",
      );
    }
    return { snapshot: existing, reused: true };
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      accounting_sync_id: validated.accountingSyncId,
      company_id: validated.companyId,
      accounting_connection_id: validated.accountingConnectionId,
      provider: validated.provider,
      tenant_or_realm_id: validated.tenantOrRealmId,
      snapshot_kind: validated.snapshotKind,
      as_of_date: validated.asOfDate,
      schema_version: validated.schemaVersion,
      payload: validated.payload,
      payload_hash: validated.payloadHash,
      source_request_ids: validated.sourceRequestIds,
      captured_at: validated.capturedAt,
    })
    .select(
      "id, accounting_sync_id, company_id, accounting_connection_id, provider, tenant_or_realm_id, snapshot_kind, as_of_date, schema_version, payload, payload_hash, source_request_ids, captured_at, created_at",
    )
    .single();
  if (error) {
    const conflict =
      error.code === "23505" ||
      /duplicate key|unique/i.test(String(error.message || ""));
    if (conflict) {
      const raced = await loadArMeasurementSnapshot({
        accountingSyncId: validated.accountingSyncId,
        asOfDate: validated.asOfDate,
      });
      if (raced && raced.payloadHash === validated.payloadHash) {
        return { snapshot: raced, reused: true };
      }
      throw new MeasurementSnapshotError(
        MEASUREMENT_SNAPSHOT_ERROR.IMMUTABLE_CONFLICT,
        "An AR measurement snapshot already exists for this sync/kind/as-of with a different payload hash.",
      );
    }
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PERSIST_FAILED,
      error.message,
    );
  }
  return { snapshot: rowToSnapshot(data as SnapshotRow), reused: false };
}
