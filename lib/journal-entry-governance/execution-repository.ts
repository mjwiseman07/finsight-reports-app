/**
 * JE-3A atomic reservation + guarded transition RPCs + Patent #6 receipts.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import {
  JE_EXECUTION_ERROR,
  type JeExecutionProvider,
  type JeExecutionStatus,
  type JePreflightResult,
  type JournalEntryExecutionRow,
} from "./execution-types";

export class JeExecutionPersistError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeExecutionPersistError";
    this.code = code;
  }
}

function coerceExecution(raw: Record<string, unknown>): JournalEntryExecutionRow {
  return {
    id: String(raw.id),
    proposal_id: String(raw.proposal_id),
    approval_id: String(raw.approval_id),
    company_id: String(raw.company_id),
    engagement_id: String(raw.engagement_id),
    firm_client_id: raw.firm_client_id ? String(raw.firm_client_id) : null,
    source_continuous_close_run_id: String(raw.source_continuous_close_run_id),
    source_accounting_sync_id: String(raw.source_accounting_sync_id),
    accounting_connection_id: String(raw.accounting_connection_id),
    provider: String(raw.provider) as JeExecutionProvider,
    proposal_hash: String(raw.proposal_hash),
    approval_policy_hash: String(raw.approval_policy_hash),
    execution_policy_hash: String(raw.execution_policy_hash),
    execution_hash: String(raw.execution_hash),
    idempotency_key: String(raw.idempotency_key),
    status: String(raw.status) as JeExecutionStatus,
    correlation_marker: String(raw.correlation_marker),
    execution_policy_snapshot:
      (raw.execution_policy_snapshot as Record<string, unknown>) || {},
    preflight_result: (raw.preflight_result as JePreflightResult) || {
      eligible: false,
      checks: [],
    },
    requested_by: String(raw.requested_by),
    requested_at: String(raw.requested_at),
    state_version: Number(raw.state_version) || 1,
    provider_journal_id: raw.provider_journal_id
      ? String(raw.provider_journal_id)
      : null,
    provider_request_hash: raw.provider_request_hash
      ? String(raw.provider_request_hash)
      : null,
    provider_response_hash: raw.provider_response_hash
      ? String(raw.provider_response_hash)
      : null,
    last_error_code: raw.last_error_code ? String(raw.last_error_code) : null,
    last_error_message: raw.last_error_message
      ? String(raw.last_error_message)
      : null,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
  };
}

function rowToRpcJson(row: JournalEntryExecutionRow): Record<string, unknown> {
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    approval_id: row.approval_id,
    company_id: row.company_id,
    engagement_id: row.engagement_id,
    firm_client_id: row.firm_client_id,
    source_continuous_close_run_id: row.source_continuous_close_run_id,
    source_accounting_sync_id: row.source_accounting_sync_id,
    accounting_connection_id: row.accounting_connection_id,
    provider: row.provider,
    proposal_hash: row.proposal_hash,
    approval_policy_hash: row.approval_policy_hash,
    execution_policy_hash: row.execution_policy_hash,
    execution_hash: row.execution_hash,
    idempotency_key: row.idempotency_key,
    status: row.status,
    correlation_marker: row.correlation_marker,
    execution_policy_snapshot: row.execution_policy_snapshot,
    preflight_result: row.preflight_result,
    requested_by: row.requested_by,
    requested_at: row.requested_at,
    state_version: row.state_version,
    provider_journal_id: null,
    provider_request_hash: row.provider_request_hash,
    provider_response_hash: null,
    last_error_code: row.last_error_code,
    last_error_message: row.last_error_message,
  };
}

export type PersistJeExecutionReservationInput = {
  row: JournalEntryExecutionRow;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export type PersistJeExecutionReservationResult = {
  reused: boolean;
  row: JournalEntryExecutionRow;
  ledgerEventId: string | null;
};

export async function persistJournalEntryExecutionReservation(
  input: PersistJeExecutionReservationInput,
): Promise<PersistJeExecutionReservationResult> {
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "persist_journal_entry_execution_reservation",
    {
      p_row: rowToRpcJson(input.row),
      p_event_payload: input.eventPayload,
      p_event_payload_canonical: canonical,
      p_firm_id: input.firmId,
      p_firm_client_id: input.firmClientId,
      p_engagement_id: input.engagementId,
      p_close_period_id: input.closePeriodId,
      p_actor_id: input.actorId,
    },
  );
  if (error) {
    const message = error.message || "unknown";
    const code = /publish_ledger_event|ledger/i.test(message)
      ? JE_EXECUTION_ERROR.LEDGER_PUBLISH_FAILED
      : JE_EXECUTION_ERROR.PERSIST_FAILED;
    throw new JeExecutionPersistError(code, message);
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  if (!row0 || typeof row0 !== "object") {
    throw new JeExecutionPersistError(
      JE_EXECUTION_ERROR.PERSIST_FAILED,
      "persist_journal_entry_execution_reservation returned no row.",
    );
  }
  const payload = row0 as {
    reused?: boolean;
    execution?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload.execution) {
    throw new JeExecutionPersistError(
      JE_EXECUTION_ERROR.PERSIST_FAILED,
      "persist_journal_entry_execution_reservation returned no execution payload.",
    );
  }
  return {
    reused: Boolean(payload.reused),
    row: coerceExecution(payload.execution),
    ledgerEventId: payload.ledger_event_id
      ? String(payload.ledger_event_id)
      : null,
  };
}

export type TransitionJeExecutionInput = {
  executionId: string;
  expectedStatus: JeExecutionStatus;
  expectedStateVersion: number;
  newStatus: "READY_TO_POST" | "PRECHECK_FAILED";
  patch: {
    preflight_result: JePreflightResult;
    provider_request_hash?: string | null;
    last_error_code?: string | null;
    last_error_message?: string | null;
  };
  eventType:
    | "journal_entry.execution_ready"
    | "journal_entry.execution_precheck_failed";
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export type TransitionJeExecutionResult = {
  row: JournalEntryExecutionRow;
  ledgerEventId: string | null;
};

export async function transitionJournalEntryExecution(
  input: TransitionJeExecutionInput,
): Promise<TransitionJeExecutionResult> {
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc("transition_journal_entry_execution", {
    p_execution_id: input.executionId,
    p_expected_status: input.expectedStatus,
    p_expected_state_version: input.expectedStateVersion,
    p_new_status: input.newStatus,
    p_patch: {
      preflight_result: input.patch.preflight_result,
      provider_request_hash: input.patch.provider_request_hash ?? null,
      last_error_code: input.patch.last_error_code ?? null,
      last_error_message: input.patch.last_error_message ?? null,
    },
    p_event_type: input.eventType,
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
    if (/concurrency|conflict/i.test(message)) {
      throw new JeExecutionPersistError(
        JE_EXECUTION_ERROR.CONCURRENCY_CONFLICT,
        message,
      );
    }
    if (/invalid.*transition/i.test(message)) {
      throw new JeExecutionPersistError(
        JE_EXECUTION_ERROR.TRANSITION_INVALID,
        message,
      );
    }
    const code = /publish_ledger_event|ledger/i.test(message)
      ? JE_EXECUTION_ERROR.LEDGER_PUBLISH_FAILED
      : JE_EXECUTION_ERROR.PERSIST_FAILED;
    throw new JeExecutionPersistError(code, message);
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  if (!row0 || typeof row0 !== "object") {
    throw new JeExecutionPersistError(
      JE_EXECUTION_ERROR.PERSIST_FAILED,
      "transition_journal_entry_execution returned no row.",
    );
  }
  const payload = row0 as {
    execution?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload.execution) {
    throw new JeExecutionPersistError(
      JE_EXECUTION_ERROR.PERSIST_FAILED,
      "transition_journal_entry_execution returned no execution payload.",
    );
  }
  return {
    row: coerceExecution(payload.execution),
    ledgerEventId: payload.ledger_event_id
      ? String(payload.ledger_event_id)
      : null,
  };
}

export { coerceExecution };
