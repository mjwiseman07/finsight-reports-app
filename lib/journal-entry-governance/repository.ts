/**
 * JE-1 atomic proposal insert + Patent #6 receipt via Postgres RPC.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import {
  JE_PROPOSAL_ERROR,
  type JournalEntryProposalRow,
  type JeExpectedEffect,
  type JeProposalLine,
  type JeProposalOriginType,
} from "./types";

export class JeProposalPersistError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeProposalPersistError";
    this.code = code;
  }
}

export type PersistJeProposalInput = {
  row: JournalEntryProposalRow;
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export type PersistJeProposalResult = {
  reused: boolean;
  row: JournalEntryProposalRow;
  ledgerEventId: string | null;
};

function rowToRpcJson(row: JournalEntryProposalRow): Record<string, unknown> {
  return {
    id: row.id,
    company_id: row.company_id,
    engagement_id: row.engagement_id,
    firm_client_id: row.firm_client_id,
    period_end: row.period_end,
    source_continuous_close_run_id: row.source_continuous_close_run_id,
    source_accounting_sync_id: row.source_accounting_sync_id,
    source_recon_run_ids: row.source_recon_run_ids,
    origin_type: row.origin_type,
    reason_code: row.reason_code,
    memo: row.memo,
    currency: row.currency,
    txn_date: row.txn_date,
    lines: row.lines,
    total_debits_cents: row.total_debits_cents,
    total_credits_cents: row.total_credits_cents,
    expected_effects: row.expected_effects,
    policy_snapshot: row.policy_snapshot,
    policy_hash: row.policy_hash,
    proposal_hash: row.proposal_hash,
    status: row.status,
    proposed_by: row.proposed_by,
    proposed_at: row.proposed_at,
    idempotency_key: row.idempotency_key,
  };
}

function coerceProposal(raw: Record<string, unknown>): JournalEntryProposalRow {
  return {
    id: String(raw.id),
    company_id: String(raw.company_id),
    engagement_id: String(raw.engagement_id),
    firm_client_id: raw.firm_client_id ? String(raw.firm_client_id) : null,
    period_end: String(raw.period_end).slice(0, 10),
    source_continuous_close_run_id: String(raw.source_continuous_close_run_id),
    source_accounting_sync_id: String(raw.source_accounting_sync_id),
    source_recon_run_ids: Array.isArray(raw.source_recon_run_ids)
      ? raw.source_recon_run_ids.map(String)
      : [],
    origin_type: String(raw.origin_type) as JeProposalOriginType,
    reason_code: String(raw.reason_code),
    memo: raw.memo == null ? null : String(raw.memo),
    currency: String(raw.currency),
    txn_date: String(raw.txn_date).slice(0, 10),
    lines: (raw.lines as JeProposalLine[]) || [],
    total_debits_cents: Number(raw.total_debits_cents),
    total_credits_cents: Number(raw.total_credits_cents),
    expected_effects: (raw.expected_effects as JeExpectedEffect[]) || [],
    policy_snapshot: (raw.policy_snapshot as Record<string, unknown>) || {},
    policy_hash: String(raw.policy_hash),
    proposal_hash: String(raw.proposal_hash),
    status: "SUBMITTED",
    proposed_by: String(raw.proposed_by),
    proposed_at: String(raw.proposed_at),
    idempotency_key: String(raw.idempotency_key),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  };
}

export async function persistJournalEntryProposal(
  input: PersistJeProposalInput,
): Promise<PersistJeProposalResult> {
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc("persist_journal_entry_proposal", {
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
      ? JE_PROPOSAL_ERROR.LEDGER_PUBLISH_FAILED
      : JE_PROPOSAL_ERROR.PERSIST_FAILED;
    throw new JeProposalPersistError(code, message);
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  if (!row0 || typeof row0 !== "object") {
    throw new JeProposalPersistError(
      JE_PROPOSAL_ERROR.PERSIST_FAILED,
      "persist_journal_entry_proposal returned no row.",
    );
  }
  const payload = row0 as {
    reused?: boolean;
    proposal?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload.proposal) {
    throw new JeProposalPersistError(
      JE_PROPOSAL_ERROR.PERSIST_FAILED,
      "persist_journal_entry_proposal returned no proposal payload.",
    );
  }
  return {
    reused: Boolean(payload.reused),
    row: coerceProposal(payload.proposal),
    ledgerEventId: payload.ledger_event_id ? String(payload.ledger_event_id) : null,
  };
}
