/**
 * JE-2 atomic approval insert + Patent #6 receipt via Postgres RPC.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
import {
  JE_APPROVAL_ERROR,
  type JeApprovalDecision,
  type JeApprovalMode,
  type JournalEntryApprovalRow,
} from "./approval-types";

export class JeApprovalPersistError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeApprovalPersistError";
    this.code = code;
  }
}

export type PersistJeApprovalInput = {
  row: JournalEntryApprovalRow;
  eventType: "journal_entry.approved" | "journal_entry.rejected";
  eventPayload: Record<string, unknown>;
  firmId: string | null;
  firmClientId: string | null;
  engagementId: string;
  closePeriodId: string | null;
  actorId: string;
};

export type PersistJeApprovalResult = {
  reused: boolean;
  row: JournalEntryApprovalRow;
  ledgerEventId: string | null;
};

function rowToRpcJson(row: JournalEntryApprovalRow): Record<string, unknown> {
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    company_id: row.company_id,
    engagement_id: row.engagement_id,
    proposal_hash: row.proposal_hash,
    policy_hash: row.policy_hash,
    decision: row.decision,
    approval_mode: row.approval_mode,
    reviewer_user_id: row.reviewer_user_id,
    reviewer_role: row.reviewer_role,
    mfa_level: row.mfa_level,
    mfa_verified_at: row.mfa_verified_at,
    decision_reason: row.decision_reason,
    policy_snapshot: row.policy_snapshot,
    approved_at: row.approved_at,
    idempotency_key: row.idempotency_key,
  };
}

function coerceApproval(raw: Record<string, unknown>): JournalEntryApprovalRow {
  return {
    id: String(raw.id),
    proposal_id: String(raw.proposal_id),
    company_id: String(raw.company_id),
    engagement_id: String(raw.engagement_id),
    proposal_hash: String(raw.proposal_hash),
    policy_hash: String(raw.policy_hash),
    decision: String(raw.decision) as JeApprovalDecision,
    approval_mode: String(raw.approval_mode) as JeApprovalMode,
    reviewer_user_id: String(raw.reviewer_user_id),
    reviewer_role: raw.reviewer_role ? String(raw.reviewer_role) : null,
    mfa_level: raw.mfa_level ? String(raw.mfa_level) : null,
    mfa_verified_at: raw.mfa_verified_at ? String(raw.mfa_verified_at) : null,
    decision_reason: raw.decision_reason == null ? null : String(raw.decision_reason),
    policy_snapshot: (raw.policy_snapshot as Record<string, unknown>) || {},
    approved_at: String(raw.approved_at),
    idempotency_key: String(raw.idempotency_key),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  };
}

export async function persistJournalEntryApproval(
  input: PersistJeApprovalInput,
): Promise<PersistJeApprovalResult> {
  const supabase = getSupabaseAdmin();
  const canonical = canonicalPayloadJson(input.eventPayload);
  const { data, error } = await supabase.rpc("persist_journal_entry_approval", {
    p_row: rowToRpcJson(input.row),
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
    const code = /publish_ledger_event|ledger/i.test(message)
      ? JE_APPROVAL_ERROR.LEDGER_PUBLISH_FAILED
      : JE_APPROVAL_ERROR.PERSIST_FAILED;
    throw new JeApprovalPersistError(code, message);
  }
  const row0 = Array.isArray(data) ? data[0] : data;
  if (!row0 || typeof row0 !== "object") {
    throw new JeApprovalPersistError(
      JE_APPROVAL_ERROR.PERSIST_FAILED,
      "persist_journal_entry_approval returned no row.",
    );
  }
  const payload = row0 as {
    reused?: boolean;
    approval?: Record<string, unknown>;
    ledger_event_id?: string | null;
  };
  if (!payload.approval) {
    throw new JeApprovalPersistError(
      JE_APPROVAL_ERROR.PERSIST_FAILED,
      "persist_journal_entry_approval returned no approval payload.",
    );
  }
  return {
    reused: Boolean(payload.reused),
    row: coerceApproval(payload.approval),
    ledgerEventId: payload.ledger_event_id ? String(payload.ledger_event_id) : null,
  };
}
