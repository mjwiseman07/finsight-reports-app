/**
 * JE-3B1 — Provider-attempt reservation + local patch RPCs.
 * No network. No legacy journal-entry poster calls.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import {
  JE_PROVIDER_ATTEMPT_ERROR,
  type JeCommitCertainty,
  type JeProviderAttemptStatus,
  type JournalEntryProviderAttemptRow,
} from "./provider-attempt-types";
import type { JournalEntryExecutionRow } from "./execution-types";
import {
  assertJe3b1DbTransitionEventPair,
  assertJe3b1EventPayloadStatusMatches,
} from "./execution-state";

export class JeProviderAttemptPersistError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeProviderAttemptPersistError";
    this.code = code;
  }
}

export function coerceAttempt(
  raw: Record<string, unknown>,
): JournalEntryProviderAttemptRow {
  return {
    id: String(raw.id),
    execution_id: String(raw.execution_id),
    accounting_connection_id: String(raw.accounting_connection_id),
    provider: "quickbooks",
    provider_request_hash: String(raw.provider_request_hash),
    correlation_marker: String(raw.correlation_marker),
    status: String(raw.status) as JeProviderAttemptStatus,
    commit_certainty: String(raw.commit_certainty) as JeCommitCertainty,
    request_started_at: raw.request_started_at
      ? String(raw.request_started_at)
      : null,
    request_completed_at: raw.request_completed_at
      ? String(raw.request_completed_at)
      : null,
    qbo_je_id: raw.qbo_je_id ? String(raw.qbo_je_id) : null,
    intuit_tid: raw.intuit_tid ? String(raw.intuit_tid) : null,
    provider_response_hash: raw.provider_response_hash
      ? String(raw.provider_response_hash)
      : null,
    provider_error_code: raw.provider_error_code
      ? String(raw.provider_error_code)
      : null,
    provider_error_message: raw.provider_error_message
      ? String(raw.provider_error_message)
      : null,
    discovery_summary:
      (raw.discovery_summary as Record<string, unknown>) || {},
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export function coerceExecution(raw: Record<string, unknown>): JournalEntryExecutionRow {
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
    provider: "quickbooks",
    proposal_hash: String(raw.proposal_hash),
    approval_policy_hash: String(raw.approval_policy_hash),
    execution_policy_hash: String(raw.execution_policy_hash),
    execution_hash: String(raw.execution_hash),
    idempotency_key: String(raw.idempotency_key),
    status: String(raw.status) as JournalEntryExecutionRow["status"],
    correlation_marker: String(raw.correlation_marker),
    execution_policy_snapshot:
      (raw.execution_policy_snapshot as Record<string, unknown>) || {},
    preflight_result:
      (raw.preflight_result as JournalEntryExecutionRow["preflight_result"]) || {
        eligible: false,
        checks: [],
      },
    requested_by: String(raw.requested_by || ""),
    requested_at: String(raw.requested_at || ""),
    state_version: Number(raw.state_version) || 0,
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

export type PersistProviderAttemptInput = {
  attempt: {
    id: string;
    execution_id: string;
    accounting_connection_id: string;
    provider: "quickbooks";
    provider_request_hash: string;
    correlation_marker: string;
  };
  /** When true and execution is READY_TO_POST, atomically → POSTING + posting_started. */
  publishPostingStarted: boolean;
  postingStartedEventPayload?: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export type PersistProviderAttemptResult = {
  reused: boolean;
  attempt: JournalEntryProviderAttemptRow;
  execution: JournalEntryExecutionRow;
  ledgerEventId: string | null;
};

export async function persistJournalEntryProviderAttempt(
  input: PersistProviderAttemptInput,
): Promise<PersistProviderAttemptResult> {
  if (input.publishPostingStarted) {
    const payload = input.postingStartedEventPayload || {};
    assertJe3b1DbTransitionEventPair({
      from: "READY_TO_POST",
      to: "POSTING",
      eventType: "journal_entry.posting_started",
    });
    assertJe3b1EventPayloadStatusMatches({
      payloadStatus: payload.status,
      newStatus: "POSTING",
    });
  }

  const supabase = getSupabaseAdmin();
  const eventPayload = input.postingStartedEventPayload || {};
  const canonical = canonicalPayloadJson(eventPayload);
  // Creation RPC owns RESERVED + NOT_SENT. Do not send caller status/certainty.
  const { data, error } = await supabase.rpc(
    "persist_journal_entry_provider_attempt",
    {
      p_row: {
        id: input.attempt.id,
        execution_id: input.attempt.execution_id,
        accounting_connection_id: input.attempt.accounting_connection_id,
        provider: input.attempt.provider,
        provider_request_hash: input.attempt.provider_request_hash,
        correlation_marker: input.attempt.correlation_marker,
      },
      p_event_payload: eventPayload,
      p_event_payload_canonical: canonical,
      p_firm_id: input.firmId,
      p_firm_client_id: input.firmClientId,
      p_engagement_id: input.engagementId,
      p_close_period_id: input.closePeriodId,
      p_actor_id: input.actorId,
      p_publish_posting_started: input.publishPostingStarted,
    },
  );

  if (error) {
    const message = error.message || "unknown";
    if (/initial_status_forbidden|initial_certainty_forbidden|initial_qbo_je_id/i.test(message)) {
      throw new JeProviderAttemptPersistError(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        message,
      );
    }
    if (/connection_mismatch/i.test(message)) {
      throw new JeProviderAttemptPersistError(
        JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_MISMATCH,
        message,
      );
    }
    if (/request_hash_mismatch/i.test(message)) {
      throw new JeProviderAttemptPersistError(
        JE_PROVIDER_ATTEMPT_ERROR.REQUEST_HASH_MISMATCH,
        message,
      );
    }
    if (/correlation_mismatch/i.test(message)) {
      throw new JeProviderAttemptPersistError(
        JE_PROVIDER_ATTEMPT_ERROR.CORRELATION_MISMATCH,
        message,
      );
    }
    if (/binding_conflict/i.test(message)) {
      throw new JeProviderAttemptPersistError(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        message,
      );
    }
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      message,
    );
  }

  const row0 = Array.isArray(data) ? data[0] : data;
  if (!row0 || typeof row0 !== "object") {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "persist_journal_entry_provider_attempt returned no row.",
    );
  }
  const payload = row0 as {
    reused?: boolean;
    attempt?: Record<string, unknown>;
    execution?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload.attempt || !payload.execution) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "persist_journal_entry_provider_attempt returned incomplete payload.",
    );
  }
  return {
    reused: Boolean(payload.reused),
    attempt: coerceAttempt(payload.attempt),
    execution: coerceExecution(payload.execution),
    ledgerEventId: payload.ledger_event_id
      ? String(payload.ledger_event_id)
      : null,
  };
}

export async function patchJournalEntryProviderAttempt(args: {
  attemptId: string;
  expectedStatus: JeProviderAttemptStatus;
  patch: Record<string, unknown>;
}): Promise<JournalEntryProviderAttemptRow> {
  // Defense: refuse conclusion mutations client-side before RPC.
  if (
    args.patch.qbo_je_id != null &&
    String(args.patch.qbo_je_id).trim() !== ""
  ) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "je_provider_attempt_patch_forbidden: qbo_je_id requires provider_commit_discovered RPC",
    );
  }
  // commit_certainty is governed custody — generic patch never owns the field.
  if (Object.prototype.hasOwnProperty.call(args.patch, "commit_certainty")) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "je_provider_attempt_patch_forbidden: commit_certainty is immutable via generic patch",
    );
  }
  if (
    args.patch.status === "REQUEST_STARTED" ||
    args.patch.status === "RESPONSE_RECEIVED" ||
    args.patch.status === "UNKNOWN_RESULT" ||
    args.patch.status === "FAILED_PRECOMMIT" ||
    args.patch.status === "DISCOVERED_COMMITTED" ||
    args.patch.status === "DISCOVERED_NOT_FOUND" ||
    args.patch.status === "VERIFIED_PROVIDER_ID"
  ) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      `je_provider_attempt_patch_forbidden: status ${String(args.patch.status)} requires dedicated receipted RPC`,
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc(
    "patch_journal_entry_provider_attempt",
    {
      p_attempt_id: args.attemptId,
      p_expected_status: args.expectedStatus,
      p_patch: args.patch,
    },
  );
  if (error) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      error.message || "patch failed",
    );
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  const attempt = (row0 as { attempt?: Record<string, unknown> })?.attempt;
  if (!attempt) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "patch returned no attempt",
    );
  }
  return coerceAttempt(attempt);
}

export type ApplyProviderCommitDiscoveredInput = {
  attemptId: string;
  expectedStatus: JeProviderAttemptStatus;
  qboJeId: string;
  providerResponseHash: string | null;
  discoverySummary: Record<string, unknown>;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export type ApplyProviderDiscoveryReceiptResult = {
  attempt: JournalEntryProviderAttemptRow;
  execution: JournalEntryExecutionRow;
  ledgerEventId: string | null;
};

export async function applyJournalEntryProviderCommitDiscovered(
  input: ApplyProviderCommitDiscoveredInput,
): Promise<ApplyProviderDiscoveryReceiptResult> {
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "apply_journal_entry_provider_commit_discovered",
    {
      p_attempt_id: input.attemptId,
      p_expected_status: input.expectedStatus,
      p_qbo_je_id: input.qboJeId,
      p_provider_response_hash: input.providerResponseHash,
      p_discovery_summary: input.discoverySummary,
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
    const message = error.message || "commit discovered failed";
    const code = /publish_ledger_event|ledger/i.test(message)
      ? "je_provider_attempt_ledger_failed"
      : JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT;
    throw new JeProviderAttemptPersistError(code, message);
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  const payload = row0 as {
    attempt?: Record<string, unknown>;
    execution?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload?.attempt || !payload?.execution) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "commit discovered returned incomplete payload",
    );
  }
  return {
    attempt: coerceAttempt(payload.attempt),
    execution: coerceExecution(payload.execution),
    ledgerEventId: payload.ledger_event_id
      ? String(payload.ledger_event_id)
      : null,
  };
}

export type ApplyProviderNotFoundConfirmedInput = {
  attemptId: string;
  expectedStatus: JeProviderAttemptStatus;
  discoverySummary: Record<string, unknown>;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export async function applyJournalEntryProviderNotFoundConfirmed(
  input: ApplyProviderNotFoundConfirmedInput,
): Promise<ApplyProviderDiscoveryReceiptResult> {
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "apply_journal_entry_provider_not_found_confirmed",
    {
      p_attempt_id: input.attemptId,
      p_expected_status: input.expectedStatus,
      p_discovery_summary: input.discoverySummary,
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
    const message = error.message || "not found confirmed failed";
    const code = /publish_ledger_event|ledger/i.test(message)
      ? "je_provider_attempt_ledger_failed"
      : JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT;
    throw new JeProviderAttemptPersistError(code, message);
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  const payload = row0 as {
    attempt?: Record<string, unknown>;
    execution?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload?.attempt || !payload?.execution) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "not found confirmed returned incomplete payload",
    );
  }
  return {
    attempt: coerceAttempt(payload.attempt),
    execution: coerceExecution(payload.execution),
    ledgerEventId: payload.ledger_event_id
      ? String(payload.ledger_event_id)
      : null,
  };
}

export async function loadProviderAttemptByExecutionId(
  executionId: string,
): Promise<JournalEntryProviderAttemptRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_provider_attempts")
    .select("*")
    .eq("execution_id", executionId)
    .maybeSingle();
  if (error) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      error.message,
    );
  }
  return data ? coerceAttempt(data as Record<string, unknown>) : null;
}
