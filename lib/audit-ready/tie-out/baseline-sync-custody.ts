/**
 * CC-2A — URM accounting-sync custody.
 *
 * Locked meaning of audit_ready_tie_out_runs.baseline_sync_id:
 *   "The accounting_syncs snapshot whose accounting state was actually used
 *    to produce this tie-out measurement."
 *
 * resolvePersistedAuthoritativeAccountingSyncId finds a candidate SUCCESS
 * accounting_syncs row (pointer / supplied / latest-success fallback).
 * It does NOT prove a resolver measured from that row.
 *
 * Worker-shipped resolvers measure from live provider reports and MUST NOT
 * stamp baseline_sync_id. Do not stamp baseline_sync_id on live-provider runs.
 * A completed live run remains custody_unknown for CC.
 *
 * CC-2A1 AR may stamp only when runArResolver is given an explicit
 * persisted_snapshot measurement whose asOfDate matches that accounting_syncs
 * report_period_end. Default AR (worker/regenerate) stays live_provider.
 *
 * Stamp only when measurementSource === "persisted_sync_snapshot".
 *
 * selectLatestCompletedTieOutRun: legacy/general — completed + completed_at DESC.
 * selectLatestCompletedTieOutRunForSync: CC-authoritative — requires a valid
 * non-empty accounting_syncs.id and exact baseline_sync_id match. Empty/null/
 * whitespace MUST fail closed; they never fall back to the general selector.
 *
 * Does NOT: change URM math; backfill historical nulls; replace a supplied
 * sync id with "latest"; write to QBO/Xero.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { selectAccountingConnectionForActiveContext } from "@/lib/integrations/accounting/connection-selection";
import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";

export const BASELINE_SYNC_CUSTODY_ERROR = "missing_baseline_sync_id" as const;
export const BASELINE_SYNC_MISMATCH_ERROR = "baseline_sync_connection_mismatch" as const;
export const BASELINE_SYNC_NOT_AUTHORITATIVE = "baseline_sync_not_authoritative" as const;
export const BASELINE_SYNC_COLLIDES_WITH_RUN = "baseline_sync_collides_with_run_id" as const;

const SUCCESS_STATUS = "SUCCESS";

export class BaselineSyncCustodyError extends Error {
  code:
    | typeof BASELINE_SYNC_CUSTODY_ERROR
    | typeof BASELINE_SYNC_MISMATCH_ERROR
    | typeof BASELINE_SYNC_NOT_AUTHORITATIVE
    | typeof BASELINE_SYNC_COLLIDES_WITH_RUN;

  constructor(
    code:
      | typeof BASELINE_SYNC_CUSTODY_ERROR
      | typeof BASELINE_SYNC_MISMATCH_ERROR
      | typeof BASELINE_SYNC_NOT_AUTHORITATIVE
      | typeof BASELINE_SYNC_COLLIDES_WITH_RUN,
    message: string,
  ) {
    super(message);
    this.name = "BaselineSyncCustodyError";
    this.code = code;
  }
}

export type AccountingSyncCustodyRow = {
  id: string;
  connection_id: string;
  source_system: string;
  validation_status: string;
  last_synced_at: string | null;
};

export type ResolveAccountingSyncCustodyInput = {
  userId: string;
  companyId?: string | null;
  tenantOrRealmId?: string | null;
  sourceSystem?: string | null;
  accountingConnectionId?: string | null;
  /**
   * Exact accounting_syncs.id already known by the caller.
   * Never replaced by pointer/latest lookup.
   */
  suppliedAccountingSyncId?: string | null;
};

export type ResolveAccountingSyncCustodyResult =
  | {
      ok: true;
      accountingSyncId: string;
      connectionId: string;
      lastSyncedAt: string | null;
      source: "supplied" | "pointer" | "latest_success";
    }
  | {
      ok: false;
      code:
        | typeof BASELINE_SYNC_CUSTODY_ERROR
        | typeof BASELINE_SYNC_MISMATCH_ERROR
        | typeof BASELINE_SYNC_NOT_AUTHORITATIVE;
      reason: string;
    };

export type AccountingSyncCustodyDeps = {
  selectConnection: (args: {
    userId: string;
    companyId?: string | null;
    tenantOrRealmId?: string | null;
    sourceSystem: string;
    connectionId?: string | null;
  }) => Promise<{
    id: string;
    provider: string;
    metadata_json: Record<string, unknown> | null;
  } | null>;
  loadSuccessSync: (args: {
    syncId: string;
    connectionId?: string | null;
    sourceSystem: string;
  }) => Promise<AccountingSyncCustodyRow | null>;
  loadLatestSuccessSync: (args: {
    connectionId: string;
    sourceSystem: string;
  }) => Promise<AccountingSyncCustodyRow | null>;
};

export const SYNC_BACKED_TIE_OUT_KINDS = [
  "ar_aging",
  "ap_aging",
  "inventory",
  "fixed_asset_rollforward",
  "grni",
  "bs_account_recon",
  "bs_recon_summary",
] as const;

export function isSyncBackedTieOutKind(kind: string): boolean {
  return (SYNC_BACKED_TIE_OUT_KINDS as readonly string[]).includes(kind);
}

export type TieOutMeasurementSource = "persisted_sync_snapshot" | "live_provider";

/**
 * Worker-shipped Option A context remains empty on this type.
 * CC-2A1 AR measurement inputs live on accounting_measurement_snapshots,
 * not accounting_syncs.normalized_payload.
 */
export type TieOutAccountingSnapshotContext = {
  accountingSyncId: string;
  accountingConnectionId: string;
  companyId: string;
  provider: "quickbooks" | "xero";
  tenantOrRealmId: string;
  /** accounting_syncs.last_synced_at — freshness authority, not created_at. */
  syncedAt: string;
  payload: Record<string, never>;
};

/**
 * Default shipped measurement source (worker/regenerate/API).
 * AR also supports an explicit persisted_snapshot path; that path is opt-in
 * and is the only AR path that may stamp baseline_sync_id.
 */
export const SHIPPED_TIE_OUT_MEASUREMENT_SOURCE: Record<
  (typeof SYNC_BACKED_TIE_OUT_KINDS)[number],
  TieOutMeasurementSource
> = {
  ar_aging: "live_provider",
  ap_aging: "live_provider",
  inventory: "live_provider",
  fixed_asset_rollforward: "live_provider",
  grni: "live_provider",
  bs_account_recon: "live_provider",
  bs_recon_summary: "live_provider",
};

export function mayStampBaselineSyncId(source: TieOutMeasurementSource): boolean {
  return source === "persisted_sync_snapshot";
}

/** CC-2 loader: null/empty baseline_sync_id is not OBSERVE-authoritative. */
export function isCcAuthoritativeUrmCustody(
  baselineSyncId: string | null | undefined,
): boolean {
  try {
    requireAuthoritativeBaselineSyncId(baselineSyncId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Insert fragment for baseline_sync_id.
 * Live-provider measurement returns {} so the column stays null (custody_unknown).
 */
export function baselineSyncInsertForMeasurement(args: {
  measurementSource: TieOutMeasurementSource;
  accountingSyncId?: string | null;
}): { baseline_sync_id: string } | Record<string, never> {
  if (!mayStampBaselineSyncId(args.measurementSource)) return {};
  return baselineSyncCustodyInsertFields(String(args.accountingSyncId || ""));
}

export function requireAuthoritativeBaselineSyncId(
  supplied: string | null | undefined,
): string {
  const id = String(supplied || "").trim();
  if (!id || id.startsWith("metadata:")) {
    throw new BaselineSyncCustodyError(
      BASELINE_SYNC_CUSTODY_ERROR,
      "A non-empty accounting_syncs.id is required to claim URM baseline_sync_id custody.",
    );
  }
  return id;
}

export function baselineSyncCustodyInsertFields(baselineSyncId: string): {
  baseline_sync_id: string;
} {
  return { baseline_sync_id: requireAuthoritativeBaselineSyncId(baselineSyncId) };
}

export function assertRunIdDistinctFromBaselineSyncId(
  runId: string,
  baselineSyncId: string,
): void {
  if (String(runId) === String(baselineSyncId)) {
    throw new BaselineSyncCustodyError(
      BASELINE_SYNC_COLLIDES_WITH_RUN,
      "runId must not equal baseline_sync_id.",
    );
  }
}

export function failedSyncBackedRunResult(code: string, message: string) {
  return {
    runId: "",
    status: "failed" as const,
    totalsStatus: "kickout" as const,
    subledgerTotalCents: 0,
    glTotalCents: 0,
    totalsVarianceCents: 0,
    itemCount: 0,
    autoReconcileCount: 0,
    reviewCount: 0,
    kickoutCount: 0,
    durationMs: 0,
    errorCode: code,
    errorMessage: message,
  };
}

function pointerSyncIdFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string {
  const raw = metadata || {};
  return String(raw.active_normalized_sync_id || raw.last_sync_id || "").trim();
}

function isAuthoritativeSuccessRow(
  row: AccountingSyncCustodyRow | null | undefined,
  sourceSystem: string,
): row is AccountingSyncCustodyRow {
  if (!row?.id) return false;
  if (row.validation_status !== SUCCESS_STATUS) return false;
  if (String(row.source_system) !== sourceSystem) return false;
  if (row.id.startsWith("metadata:")) return false;
  return true;
}

export async function resolvePersistedAuthoritativeAccountingSyncIdWithDeps(
  input: ResolveAccountingSyncCustodyInput,
  deps: AccountingSyncCustodyDeps,
): Promise<ResolveAccountingSyncCustodyResult> {
  const sourceSystem = String(input.sourceSystem || "quickbooks").trim() || "quickbooks";
  const supplied = String(input.suppliedAccountingSyncId || "").trim();

  const connection = await deps.selectConnection({
    userId: input.userId,
    companyId: input.companyId,
    tenantOrRealmId: input.tenantOrRealmId,
    sourceSystem,
    connectionId: input.accountingConnectionId,
  });
  if (!connection?.id) {
    return {
      ok: false,
      code: BASELINE_SYNC_CUSTODY_ERROR,
      reason: "accounting_connection_not_found",
    };
  }

  if (supplied) {
    // Supplied identity is authority — never replaced by pointer or latest.
    const row = await deps.loadSuccessSync({
      syncId: supplied,
      sourceSystem,
    });
    if (!isAuthoritativeSuccessRow(row, sourceSystem)) {
      return {
        ok: false,
        code: BASELINE_SYNC_NOT_AUTHORITATIVE,
        reason: "supplied_sync_not_authoritative",
      };
    }
    if (row.connection_id !== connection.id) {
      return {
        ok: false,
        code: BASELINE_SYNC_MISMATCH_ERROR,
        reason: "supplied_sync_connection_mismatch",
      };
    }
    return {
      ok: true,
      accountingSyncId: row.id,
      connectionId: connection.id,
      lastSyncedAt: row.last_synced_at,
      source: "supplied",
    };
  }

  const pointer = pointerSyncIdFromMetadata(connection.metadata_json);
  if (pointer && !pointer.startsWith("metadata:")) {
    const pointed = await deps.loadSuccessSync({
      syncId: pointer,
      connectionId: connection.id,
      sourceSystem,
    });
    if (isAuthoritativeSuccessRow(pointed, sourceSystem) && pointed.connection_id === connection.id) {
      return {
        ok: true,
        accountingSyncId: pointed.id,
        connectionId: connection.id,
        lastSyncedAt: pointed.last_synced_at,
        source: "pointer",
      };
    }
  }

  const latest = await deps.loadLatestSuccessSync({
    connectionId: connection.id,
    sourceSystem,
  });
  if (isAuthoritativeSuccessRow(latest, sourceSystem) && latest.connection_id === connection.id) {
    return {
      ok: true,
      accountingSyncId: latest.id,
      connectionId: connection.id,
      lastSyncedAt: latest.last_synced_at,
      source: "latest_success",
    };
  }

  return {
    ok: false,
    code: BASELINE_SYNC_CUSTODY_ERROR,
    reason: "no_authoritative_accounting_sync",
  };
}

function asSyncRow(raw: Record<string, unknown> | null | undefined): AccountingSyncCustodyRow | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    connection_id: String(raw.connection_id || ""),
    source_system: String(raw.source_system || ""),
    validation_status: String(raw.validation_status || ""),
    last_synced_at: raw.last_synced_at == null ? null : String(raw.last_synced_at),
  };
}

export async function resolvePersistedAuthoritativeAccountingSyncId(
  input: ResolveAccountingSyncCustodyInput,
): Promise<ResolveAccountingSyncCustodyResult> {
  const supabase = getSupabaseAdmin();
  return resolvePersistedAuthoritativeAccountingSyncIdWithDeps(input, {
    selectConnection: async (args) => {
      const connection = await selectAccountingConnectionForActiveContext({
        supabase,
        userId: args.userId,
        connectionId: args.connectionId,
        sourceSystem: args.sourceSystem,
        companyId: args.companyId,
        tenantOrRealmId: args.tenantOrRealmId,
      });
      if (!connection) return null;
      return {
        id: connection.id,
        provider: String(connection.provider || args.sourceSystem),
        metadata_json: (connection.metadata_json as Record<string, unknown> | null) ?? null,
      };
    },
    loadSuccessSync: async ({ syncId, connectionId, sourceSystem }) => {
      let query = supabase
        .from("accounting_syncs")
        .select("id, connection_id, source_system, validation_status, last_synced_at")
        .eq("id", syncId)
        .eq("source_system", sourceSystem)
        .eq("validation_status", SUCCESS_STATUS);
      if (connectionId) query = query.eq("connection_id", connectionId);
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      return asSyncRow(data as Record<string, unknown> | null);
    },
    loadLatestSuccessSync: async ({ connectionId, sourceSystem }) => {
      const { data, error } = await supabase
        .from("accounting_syncs")
        .select("id, connection_id, source_system, validation_status, last_synced_at")
        .eq("connection_id", connectionId)
        .eq("source_system", sourceSystem)
        .eq("validation_status", SUCCESS_STATUS)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return asSyncRow(data as Record<string, unknown> | null);
    },
  });
}

export type CompletedTieOutRunCandidate = {
  id: string;
  status: string;
  completedAt: string | null;
  baselineSyncId: string | null;
};

function completedRunsNewestFirst(
  rows: CompletedTieOutRunCandidate[],
): CompletedTieOutRunCandidate[] {
  return rows
    .filter((row) => row.status === "completed" && Boolean(row.completedAt))
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
}

/** Legacy/general: latest completed. Null-custody runs are eligible. */
export function selectLatestCompletedTieOutRunFromCandidates(
  rows: CompletedTieOutRunCandidate[],
): CompletedTieOutRunCandidate | null {
  return completedRunsNewestFirst(rows)[0] ?? null;
}

/**
 * CC-authoritative candidate pick.
 * baselineSyncId must be a valid non-empty accounting_syncs.id.
 * Empty / whitespace / null fail closed — never general selection.
 */
export function selectLatestCompletedTieOutRunForSyncFromCandidates(
  rows: CompletedTieOutRunCandidate[],
  args: { baselineSyncId: string },
): CompletedTieOutRunCandidate | null {
  const requiredSync = requireAuthoritativeBaselineSyncId(args.baselineSyncId);
  return (
    completedRunsNewestFirst(rows).find(
      (row) => String(row.baselineSyncId) === requiredSync,
    ) ?? null
  );
}

type LatestCompletedTieOutRunRow = {
  id: string;
  baselineSyncId: string | null;
  completedAt: string;
};

async function loadLatestCompletedTieOutRun(args: {
  engagementId: string;
  periodEnd: string;
  tieOutKind: TieOutKind | string;
  baselineSyncId?: string;
}): Promise<LatestCompletedTieOutRunRow | null> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("audit_ready_tie_out_runs")
    .select("id, baseline_sync_id, completed_at")
    .eq("engagement_id", args.engagementId)
    .eq("period_end", args.periodEnd)
    .eq("tie_out_kind", args.tieOutKind)
    .eq("status", "completed");
  if (args.baselineSyncId) {
    query = query.eq("baseline_sync_id", args.baselineSyncId);
  }
  const { data, error } = await query
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || !data.completed_at) return null;
  return {
    id: String(data.id),
    baselineSyncId: data.baseline_sync_id == null ? null : String(data.baseline_sync_id),
    completedAt: String(data.completed_at),
  };
}

/** Legacy/general selector. Does not accept a sync id. */
export async function selectLatestCompletedTieOutRun(args: {
  engagementId: string;
  periodEnd: string;
  tieOutKind: TieOutKind | string;
}): Promise<LatestCompletedTieOutRunRow | null> {
  return loadLatestCompletedTieOutRun(args);
}

/**
 * CC-authoritative selector for an observed accounting_syncs.id.
 * Throws BaselineSyncCustodyError if baselineSyncId is empty, whitespace, null,
 * or a metadata: pointer. Never falls back to general selection.
 */
export async function selectLatestCompletedTieOutRunForSync(args: {
  engagementId: string;
  periodEnd: string;
  tieOutKind: TieOutKind | string;
  baselineSyncId: string;
}): Promise<LatestCompletedTieOutRunRow | null> {
  const baselineSyncId = requireAuthoritativeBaselineSyncId(args.baselineSyncId);
  const row = await loadLatestCompletedTieOutRun({ ...args, baselineSyncId });
  if (!row) return null;
  if (row.baselineSyncId !== baselineSyncId) return null;
  return row;
}
