/**
 * Exact-sync / URM / engagement loaders for CC-2B.
 *
 * No pointer, latest-success, or period-match fallback for the observe sync.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { asIsoDate } from "@/lib/audit-ready/measurement-snapshots/validate";
import { countEvidenceByReconcilingItemIds } from "@/lib/audit-ready/tie-out/ar-ap-urm";
import type { ReconOutcome } from "@/lib/audit-ready/tie-out/recon-model";
import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";
import { PERSIST_OBSERVE_ERROR, type ObserveAccountingState } from "./types";
import type { AuthoritativeUrmRunFacts } from "./authoritative-urm-mapper";

export class PersistObserveLoadError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PersistObserveLoadError";
    this.code = code;
  }
}

function requireText(value: unknown): string {
  return String(value || "").trim();
}

export function extractStatementControl(payload: unknown): {
  statementControl: StatementControlResult | null;
  statementControlContractVersion: number | null;
} {
  if (!payload || typeof payload !== "object") {
    return { statementControl: null, statementControlContractVersion: null };
  }
  const row = payload as Record<string, unknown>;
  const control = row.statementControl;
  const versionRaw = row.statementControlContractVersion;
  const version =
    versionRaw == null || versionRaw === ""
      ? null
      : Number(versionRaw);
  return {
    statementControl:
      control && typeof control === "object"
        ? (control as StatementControlResult)
        : null,
    statementControlContractVersion: Number.isFinite(version) ? version : null,
  };
}

export async function loadExactObserveAccountingSync(args: {
  accountingSyncId: string;
  expectedCompanyId: string;
  expectedPeriodEnd: string;
  expectedConnectionId?: string | null;
}): Promise<ObserveAccountingState> {
  const syncId = requireText(args.accountingSyncId);
  if (!syncId) {
    throw new PersistObserveLoadError(
      PERSIST_OBSERVE_ERROR.SYNC_UNAVAILABLE,
      "Observation accountingSyncId is required.",
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounting_syncs")
    .select(
      "id, company_id, connection_id, source_system, tenant_id, " +
        "report_period_start, report_period_end, validation_status, " +
        "last_synced_at, normalized_payload",
    )
    .eq("id", syncId)
    .maybeSingle();
  if (error) {
    throw new PersistObserveLoadError(PERSIST_OBSERVE_ERROR.SYNC_UNAVAILABLE, error.message);
  }
  if (!data?.id) {
    throw new PersistObserveLoadError(
      PERSIST_OBSERVE_ERROR.SYNC_UNAVAILABLE,
      "accounting_syncs row was not found for the observation sync.",
    );
  }
  if (String(data.validation_status || "") !== "SUCCESS") {
    throw new PersistObserveLoadError(
      PERSIST_OBSERVE_ERROR.SYNC_NOT_SUCCESS,
      "Observe accounting_syncs.validation_status must be SUCCESS.",
    );
  }
  const companyId = requireText(data.company_id);
  if (companyId !== args.expectedCompanyId) {
    throw new PersistObserveLoadError(
      PERSIST_OBSERVE_ERROR.SYNC_COMPANY_MISMATCH,
      "accounting_syncs.company_id does not match the observation company.",
    );
  }
  const periodEnd = asIsoDate(data.report_period_end);
  if (periodEnd !== asIsoDate(args.expectedPeriodEnd)) {
    throw new PersistObserveLoadError(
      PERSIST_OBSERVE_ERROR.SYNC_PERIOD_MISMATCH,
      "accounting_syncs.report_period_end does not match the observation period.",
    );
  }
  const connectionId = requireText(data.connection_id);
  const expectedConnectionId = requireText(args.expectedConnectionId);
  if (expectedConnectionId && connectionId !== expectedConnectionId) {
    throw new PersistObserveLoadError(
      PERSIST_OBSERVE_ERROR.SYNC_CONNECTION_MISMATCH,
      "accounting_syncs.connection_id does not match the observation connection.",
    );
  }
  const providerRaw = requireText(data.source_system);
  if (providerRaw !== "quickbooks" && providerRaw !== "xero") {
    throw new PersistObserveLoadError(
      PERSIST_OBSERVE_ERROR.PROVIDER_UNSUPPORTED,
      "Observe provider must be quickbooks or xero.",
    );
  }
  const control = extractStatementControl(data.normalized_payload);
  const lastSyncedAt = data.last_synced_at ? String(data.last_synced_at) : null;
  return {
    accountingSyncId: String(data.id),
    companyId,
    accountingConnectionId: connectionId,
    provider: providerRaw,
    tenantOrRealmId: requireText(data.tenant_id),
    periodStart: asIsoDate(data.report_period_start),
    periodEnd,
    syncedAt: lastSyncedAt,
    statementControl: control.statementControl,
    statementControlContractVersion: control.statementControlContractVersion,
  };
}

export async function loadAuthoritativeUrmRunFacts(
  runId: string,
): Promise<AuthoritativeUrmRunFacts | null> {
  const id = requireText(runId);
  if (!id) return null;
  const supabase = getSupabaseAdmin();
  const { data: run, error } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, period_end, tie_out_kind, recon_outcome, totals_variance_cents, " +
        "identified_items_total_cents, unidentified_residual_cents, baseline_sync_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!run) return null;

  const { data: items, error: itemsErr } = await supabase
    .from("audit_ready_reconciling_items")
    .select("id")
    .eq("run_id", id);
  if (itemsErr) throw new Error(itemsErr.message);

  return {
    runId: String(run.id),
    tieOutKind: String(run.tie_out_kind || ""),
    periodEnd: run.period_end ? String(run.period_end) : null,
    reconOutcome: (run.recon_outcome as ReconOutcome | null) ?? null,
    grossVarianceCents:
      run.totals_variance_cents == null ? null : Number(run.totals_variance_cents),
    identifiedTotalCents:
      run.identified_items_total_cents == null
        ? null
        : Number(run.identified_items_total_cents),
    unidentifiedResidualCents:
      run.unidentified_residual_cents == null
        ? null
        : Number(run.unidentified_residual_cents),
    baselineSyncId: (run.baseline_sync_id as string | null) ?? null,
    itemIds: (items ?? []).map((row: { id: string }) => String(row.id)),
  };
}

export async function countUrmEvidenceSpine(itemIds: readonly string[]): Promise<number> {
  const ids = itemIds.filter(Boolean);
  if (ids.length === 0) return 0;
  const counts = await countEvidenceByReconcilingItemIds(ids);
  return Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
}

export async function loadEngagementScope(engagementId: string): Promise<{
  firmId: string | null;
  firmClientId: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_engagements")
    .select("firm_id, firm_client_id")
    .eq("id", engagementId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    firmId: data?.firm_id ? String(data.firm_id) : null,
    firmClientId: data?.firm_client_id ? String(data.firm_client_id) : null,
  };
}

export async function loadExactClosePeriodId(args: {
  firmClientId: string | null;
  periodStart: string | null;
  periodEnd: string;
}): Promise<string | null> {
  const firmClientId = requireText(args.firmClientId);
  const periodStart = requireText(args.periodStart);
  const periodEnd = requireText(args.periodEnd);
  if (!firmClientId || !periodStart || !periodEnd) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("close_periods")
    .select("id")
    .eq("firm_client_id", firmClientId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ? String(data.id) : null;
}

export async function loadPriorContinuousCloseRunId(args: {
  engagementId: string;
  periodEnd: string;
  accountingSyncId: string;
}): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("continuous_close_runs")
    .select("id")
    .eq("engagement_id", args.engagementId)
    .eq("period_end", args.periodEnd)
    .eq("accounting_sync_id", args.accountingSyncId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ? String(data.id) : null;
}

export async function loadContinuousCloseRunByIdempotencyKey(
  idempotencyKey: string,
): Promise<import("./types").ContinuousCloseRunRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("continuous_close_runs")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data as import("./types").ContinuousCloseRunRow) : null;
}
