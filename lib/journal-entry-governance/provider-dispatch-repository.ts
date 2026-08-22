/**
 * JE-3B2 — Dispatch + terminal outcome RPC wrappers.
 * No network. No Memory. No legacy poster.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import {
  JeProviderAttemptPersistError,
  coerceAttempt,
  coerceExecution,
} from "./provider-attempt-repository";
import {
  JE_PROVIDER_ATTEMPT_ERROR,
  type JeProviderAttemptStatus,
  type JournalEntryProviderAttemptRow,
} from "./provider-attempt-types";
import type { JournalEntryExecutionRow } from "./execution-types";
import {
  assertJe3b1DbTransitionEventPair,
  assertJe3b1EventPayloadStatusMatches,
} from "./execution-state";

// Re-export coercers used by tests via this module if needed.
export { coerceAttempt, coerceExecution };

export type Je3b2ReceiptResult = {
  attempt: JournalEntryProviderAttemptRow;
  execution: JournalEntryExecutionRow;
  ledgerEventId: string | null;
};

function parseReceiptPayload(data: unknown, label: string): Je3b2ReceiptResult {
  const row0 = Array.isArray(data) ? data[0] : data;
  const payload = row0 as {
    attempt?: Record<string, unknown>;
    execution?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload?.attempt || !payload?.execution) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      `${label} returned incomplete payload`,
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

function mapRpcError(error: { message?: string }, label: string): never {
  const message = error.message || `${label} failed`;
  const code = /publish_ledger_event|ledger/i.test(message)
    ? "je_provider_attempt_ledger_failed"
    : JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT;
  throw new JeProviderAttemptPersistError(code, message);
}

export async function applyJournalEntryProviderDispatchStarted(input: {
  attemptId: string;
  expectedStatus: JeProviderAttemptStatus;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
}): Promise<Je3b2ReceiptResult> {
  if (input.expectedStatus !== "RESERVED") {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      "dispatch_started requires expectedStatus RESERVED",
    );
  }
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "apply_journal_entry_provider_dispatch_started",
    {
      p_attempt_id: input.attemptId,
      p_expected_status: input.expectedStatus,
      p_event_payload: input.eventPayload,
      p_event_payload_canonical: canonical,
      p_firm_id: input.firmId,
      p_firm_client_id: input.firmClientId,
      p_engagement_id: input.engagementId,
      p_close_period_id: input.closePeriodId,
      p_actor_id: input.actorId,
    },
  );
  if (error) mapRpcError(error, "dispatch_started");
  return parseReceiptPayload(data, "dispatch_started");
}

export async function applyJournalEntryProviderPosted(input: {
  attemptId: string;
  expectedStatus: JeProviderAttemptStatus;
  qboJeId: string;
  intuitTid: string | null;
  providerResponseHash: string | null;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
}): Promise<Je3b2ReceiptResult> {
  assertJe3b1DbTransitionEventPair({
    from: "POSTING",
    to: "POSTED_UNVERIFIED",
    eventType: "journal_entry.provider_posted",
  });
  assertJe3b1EventPayloadStatusMatches({
    payloadStatus: input.eventPayload.status,
    newStatus: "POSTED_UNVERIFIED",
  });
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "apply_journal_entry_provider_posted",
    {
      p_attempt_id: input.attemptId,
      p_expected_status: input.expectedStatus,
      p_qbo_je_id: input.qboJeId,
      p_intuit_tid: input.intuitTid,
      p_provider_response_hash: input.providerResponseHash,
      p_event_payload: input.eventPayload,
      p_event_payload_canonical: canonical,
      p_firm_id: input.firmId,
      p_firm_client_id: input.firmClientId,
      p_engagement_id: input.engagementId,
      p_close_period_id: input.closePeriodId,
      p_actor_id: input.actorId,
    },
  );
  if (error) mapRpcError(error, "provider_posted");
  return parseReceiptPayload(data, "provider_posted");
}

export async function applyJournalEntryProviderPostUnknown(input: {
  attemptId: string;
  expectedStatus: JeProviderAttemptStatus;
  intuitTid: string | null;
  providerErrorCode: string | null;
  providerErrorMessage: string | null;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
}): Promise<Je3b2ReceiptResult> {
  assertJe3b1DbTransitionEventPair({
    from: "POSTING",
    to: "UNKNOWN_COMMIT",
    eventType: "journal_entry.post_unknown",
  });
  assertJe3b1EventPayloadStatusMatches({
    payloadStatus: input.eventPayload.status,
    newStatus: "UNKNOWN_COMMIT",
  });
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "apply_journal_entry_provider_post_unknown",
    {
      p_attempt_id: input.attemptId,
      p_expected_status: input.expectedStatus,
      p_intuit_tid: input.intuitTid,
      p_provider_error_code: input.providerErrorCode,
      p_provider_error_message: input.providerErrorMessage,
      p_event_payload: input.eventPayload,
      p_event_payload_canonical: canonical,
      p_firm_id: input.firmId,
      p_firm_client_id: input.firmClientId,
      p_engagement_id: input.engagementId,
      p_close_period_id: input.closePeriodId,
      p_actor_id: input.actorId,
    },
  );
  if (error) mapRpcError(error, "post_unknown");
  return parseReceiptPayload(data, "post_unknown");
}

export async function applyJournalEntryProviderPrecommitFailed(input: {
  attemptId: string;
  expectedStatus: JeProviderAttemptStatus;
  providerErrorCode: string | null;
  providerErrorMessage: string | null;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
}): Promise<Je3b2ReceiptResult> {
  assertJe3b1DbTransitionEventPair({
    from: "POSTING",
    to: "FAILED",
    eventType: "journal_entry.execution_failed",
  });
  assertJe3b1EventPayloadStatusMatches({
    payloadStatus: input.eventPayload.status,
    newStatus: "FAILED",
  });
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "apply_journal_entry_provider_precommit_failed",
    {
      p_attempt_id: input.attemptId,
      p_expected_status: input.expectedStatus,
      p_provider_error_code: input.providerErrorCode,
      p_provider_error_message: input.providerErrorMessage,
      p_event_payload: input.eventPayload,
      p_event_payload_canonical: canonical,
      p_firm_id: input.firmId,
      p_firm_client_id: input.firmClientId,
      p_engagement_id: input.engagementId,
      p_close_period_id: input.closePeriodId,
      p_actor_id: input.actorId,
    },
  );
  if (error) mapRpcError(error, "precommit_failed");
  return parseReceiptPayload(data, "precommit_failed");
}
