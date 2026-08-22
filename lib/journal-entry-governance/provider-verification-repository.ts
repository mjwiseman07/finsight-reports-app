/**
 * JE-3C — Verified / verification-mismatch RPC wrappers.
 * No network. No Memory. No legacy poster. No POST.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import {
  JeProviderAttemptPersistError,
  coerceAttempt,
  coerceExecution,
} from "./provider-attempt-repository";
import { JE_PROVIDER_ATTEMPT_ERROR } from "./provider-attempt-types";
import type { JournalEntryProviderAttemptRow } from "./provider-attempt-types";
import type { JournalEntryExecutionRow } from "./execution-types";
import {
  assertJe3cDbTransitionEventPair,
  assertJe3cEventPayloadStatusMatches,
} from "./execution-state";

export type Je3cReceiptResult = {
  attempt: JournalEntryProviderAttemptRow;
  execution: JournalEntryExecutionRow;
  ledgerEventId: string | null;
};

function parseReceiptPayload(data: unknown, label: string): Je3cReceiptResult {
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
    : /state_version concurrency/i.test(message)
      ? "je_execution_concurrency_conflict"
      : JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT;
  throw new JeProviderAttemptPersistError(code, message);
}

export async function applyJournalEntryVerified(input: {
  executionId: string;
  expectedStatus: "POSTED_UNVERIFIED";
  expectedStateVersion: number;
  attemptId: string;
  expectedAttemptStatus: "RESPONSE_RECEIVED";
  providerReadbackHash: string;
  verificationSnapshot: Record<string, unknown>;
  verificationMetadata: Record<string, unknown>;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
}): Promise<Je3cReceiptResult> {
  assertJe3cDbTransitionEventPair({
    from: "POSTED_UNVERIFIED",
    to: "VERIFIED",
    eventType: "journal_entry.verified",
  });
  assertJe3cEventPayloadStatusMatches({
    payloadStatus: input.eventPayload.status,
    newStatus: "VERIFIED",
  });
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc("apply_journal_entry_verified", {
    p_execution_id: input.executionId,
    p_expected_status: input.expectedStatus,
    p_expected_state_version: input.expectedStateVersion,
    p_attempt_id: input.attemptId,
    p_expected_attempt_status: input.expectedAttemptStatus,
    p_provider_readback_hash: input.providerReadbackHash,
    p_verification_snapshot: input.verificationSnapshot,
    p_verification_metadata: input.verificationMetadata,
    p_event_payload: input.eventPayload,
    p_event_payload_canonical: canonical,
    p_firm_id: input.firmId,
    p_firm_client_id: input.firmClientId,
    p_engagement_id: input.engagementId,
    p_close_period_id: input.closePeriodId,
    p_actor_id: input.actorId,
  });
  if (error) mapRpcError(error, "apply_journal_entry_verified");
  return parseReceiptPayload(data, "apply_journal_entry_verified");
}

export async function applyJournalEntryVerificationMismatch(input: {
  executionId: string;
  expectedStatus: "POSTED_UNVERIFIED";
  expectedStateVersion: number;
  attemptId: string;
  expectedAttemptStatus: "RESPONSE_RECEIVED";
  providerReadbackHash: string | null;
  verificationSnapshot: Record<string, unknown>;
  verificationMetadata: Record<string, unknown>;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
}): Promise<Je3cReceiptResult> {
  assertJe3cDbTransitionEventPair({
    from: "POSTED_UNVERIFIED",
    to: "VERIFICATION_MISMATCH",
    eventType: "journal_entry.verification_mismatch",
  });
  assertJe3cEventPayloadStatusMatches({
    payloadStatus: input.eventPayload.status,
    newStatus: "VERIFICATION_MISMATCH",
  });
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc(
    "apply_journal_entry_verification_mismatch",
    {
      p_execution_id: input.executionId,
      p_expected_status: input.expectedStatus,
      p_expected_state_version: input.expectedStateVersion,
      p_attempt_id: input.attemptId,
      p_expected_attempt_status: input.expectedAttemptStatus,
      p_provider_readback_hash: input.providerReadbackHash,
      p_verification_snapshot: input.verificationSnapshot,
      p_verification_metadata: input.verificationMetadata,
      p_event_payload: input.eventPayload,
      p_event_payload_canonical: canonical,
      p_firm_id: input.firmId,
      p_firm_client_id: input.firmClientId,
      p_engagement_id: input.engagementId,
      p_close_period_id: input.closePeriodId,
      p_actor_id: input.actorId,
    },
  );
  if (error) mapRpcError(error, "apply_journal_entry_verification_mismatch");
  return parseReceiptPayload(data, "apply_journal_entry_verification_mismatch");
}
