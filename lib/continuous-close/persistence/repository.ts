/**
 * continuous_close_runs insert via atomic RPC (row + ledger receipt).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import { PERSIST_OBSERVE_ERROR, type PersistContinuousCloseRunInput, type PersistContinuousCloseRunResult, type ContinuousCloseRunRow } from "./types";

export class PersistObserveWriteError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PersistObserveWriteError";
    this.code = code;
  }
}

function rowToRpcJson(row: ContinuousCloseRunRow): Record<string, unknown> {
  return {
    id: row.id,
    company_id: row.company_id,
    engagement_id: row.engagement_id,
    firm_client_id: row.firm_client_id,
    close_period_id: row.close_period_id,
    accounting_sync_id: row.accounting_sync_id,
    period_end: row.period_end,
    mode: row.mode,
    readiness: row.readiness,
    status: row.status,
    policy_hash: row.policy_hash,
    input_hash: row.input_hash,
    policy_snapshot: row.policy_snapshot,
    observation_summary: row.observation_summary,
    result: row.result,
    created_by: row.created_by,
    started_at: row.started_at,
    completed_at: row.completed_at,
    supersedes_run_id: row.supersedes_run_id,
    idempotency_key: row.idempotency_key,
  };
}

function coerceRun(raw: Record<string, unknown>): ContinuousCloseRunRow {
  return {
    id: String(raw.id),
    company_id: String(raw.company_id),
    engagement_id: String(raw.engagement_id),
    firm_client_id: raw.firm_client_id ? String(raw.firm_client_id) : null,
    close_period_id: raw.close_period_id ? String(raw.close_period_id) : null,
    accounting_sync_id: String(raw.accounting_sync_id),
    period_end: String(raw.period_end).slice(0, 10),
    mode: "OBSERVE",
    readiness: raw.readiness as ContinuousCloseRunRow["readiness"],
    status: "completed",
    policy_hash: String(raw.policy_hash),
    input_hash: String(raw.input_hash),
    policy_snapshot: (raw.policy_snapshot as Record<string, unknown>) || {},
    observation_summary: (raw.observation_summary as Record<string, unknown>) || {},
    result: (raw.result as Record<string, unknown>) || {},
    created_by: String(raw.created_by),
    started_at: String(raw.started_at),
    completed_at: String(raw.completed_at),
    supersedes_run_id: raw.supersedes_run_id ? String(raw.supersedes_run_id) : null,
    idempotency_key: String(raw.idempotency_key),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  };
}

export async function persistContinuousCloseObserveRun(
  input: PersistContinuousCloseRunInput,
): Promise<PersistContinuousCloseRunResult> {
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc("persist_continuous_close_observe_run", {
    p_row: rowToRpcJson(input.row),
    p_event_payload: input.eventPayload,
    p_event_payload_canonical: canonical,
    p_firm_id: input.firmId,
    p_firm_client_id: input.firmClientId,
    p_engagement_id: input.engagementId,
    p_close_period_id: input.closePeriodId,
    p_actor_id: input.actorId,
  });
  if (error) {
    const message = error.message || "unknown";
    const code = /publish_ledger_event|ledger/i.test(message)
      ? PERSIST_OBSERVE_ERROR.LEDGER_PUBLISH_FAILED
      : PERSIST_OBSERVE_ERROR.PERSIST_FAILED;
    throw new PersistObserveWriteError(code, message);
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  if (!row0 || typeof row0 !== "object") {
    throw new PersistObserveWriteError(
      PERSIST_OBSERVE_ERROR.PERSIST_FAILED,
      "persist_continuous_close_observe_run returned no row.",
    );
  }
  const payload = row0 as {
    reused?: boolean;
    run?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload.run) {
    throw new PersistObserveWriteError(
      PERSIST_OBSERVE_ERROR.PERSIST_FAILED,
      "persist_continuous_close_observe_run returned no run payload.",
    );
  }
  return {
    reused: Boolean(payload.reused),
    row: coerceRun(payload.run),
    ledgerEventId: payload.ledger_event_id ? String(payload.ledger_event_id) : null,
  };
}
