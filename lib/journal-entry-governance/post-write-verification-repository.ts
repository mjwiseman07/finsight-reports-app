/**
 * JE-4 run persistence. Service-role only. Authenticated clients have SELECT
 * through engagement membership and no insert/update policy.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  PostWriteVerificationError,
  type Je4EffectConclusion,
  type Je4ReadinessState,
  type Je4RunRow,
  type Je4RunStatus,
} from "./post-write-verification-types";

export type PostWriteVerificationRepository = {
  listByExecutionPolicy(args: {
    executionId: string;
    policyHash: string;
  }): Promise<Je4RunRow[]>;
  insert(row: Je4RunRow): Promise<Je4RunRow>;
  update(row: Je4RunRow): Promise<Je4RunRow>;
};

const COLUMNS = [
  "id",
  "execution_id",
  "company_id",
  "engagement_id",
  "firm_client_id",
  "accounting_connection_id",
  "provider_journal_id",
  "provider_readback_hash",
  "verification_ledger_event_id",
  "source_accounting_sync_id",
  "accounting_sync_id",
  "observation_id",
  "tie_out_run_ids",
  "continuous_close_run_id",
  "source_continuous_close_run_id",
  "policy_hash",
  "input_hash",
  "idempotency_key",
  "status",
  "effect_conclusion",
  "retryable",
  "readiness",
  "evidence",
  "failure_code",
  "failure_message",
  "created_at",
  "updated_at",
].join(", ");

function asRow(raw: Record<string, unknown>): Je4RunRow {
  const tieOut = raw.tie_out_run_ids;
  return {
    id: String(raw.id),
    execution_id: String(raw.execution_id),
    company_id: String(raw.company_id),
    engagement_id: String(raw.engagement_id),
    firm_client_id: raw.firm_client_id ? String(raw.firm_client_id) : null,
    accounting_connection_id: String(raw.accounting_connection_id),
    provider_journal_id: raw.provider_journal_id
      ? String(raw.provider_journal_id)
      : null,
    provider_readback_hash: String(raw.provider_readback_hash),
    verification_ledger_event_id: String(raw.verification_ledger_event_id),
    source_accounting_sync_id: String(raw.source_accounting_sync_id),
    accounting_sync_id: raw.accounting_sync_id
      ? String(raw.accounting_sync_id)
      : null,
    observation_id: raw.observation_id ? String(raw.observation_id) : null,
    tie_out_run_ids: Array.isArray(tieOut) ? tieOut.map(String) : [],
    continuous_close_run_id: raw.continuous_close_run_id
      ? String(raw.continuous_close_run_id)
      : null,
    source_continuous_close_run_id: String(raw.source_continuous_close_run_id),
    policy_hash: String(raw.policy_hash),
    input_hash: String(raw.input_hash),
    idempotency_key: String(raw.idempotency_key),
    status: String(raw.status) as Je4RunStatus,
    effect_conclusion: String(raw.effect_conclusion) as Je4EffectConclusion,
    retryable: Boolean(raw.retryable),
    readiness: raw.readiness ? (String(raw.readiness) as Je4ReadinessState) : null,
    evidence: (raw.evidence as Record<string, unknown>) || {},
    failure_code: raw.failure_code ? String(raw.failure_code) : null,
    failure_message: raw.failure_message ? String(raw.failure_message) : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key|unique constraint/i.test(String(error.message || ""));
}

function toDb(row: Je4RunRow): Record<string, unknown> {
  return {
    id: row.id,
    execution_id: row.execution_id,
    company_id: row.company_id,
    engagement_id: row.engagement_id,
    firm_client_id: row.firm_client_id,
    accounting_connection_id: row.accounting_connection_id,
    provider_journal_id: row.provider_journal_id,
    provider_readback_hash: row.provider_readback_hash,
    verification_ledger_event_id: row.verification_ledger_event_id,
    source_accounting_sync_id: row.source_accounting_sync_id,
    accounting_sync_id: row.accounting_sync_id,
    observation_id: row.observation_id,
    tie_out_run_ids: row.tie_out_run_ids,
    continuous_close_run_id: row.continuous_close_run_id,
    source_continuous_close_run_id: row.source_continuous_close_run_id,
    policy_hash: row.policy_hash,
    input_hash: row.input_hash,
    idempotency_key: row.idempotency_key,
    status: row.status,
    effect_conclusion: row.effect_conclusion,
    retryable: row.retryable,
    readiness: row.readiness,
    evidence: row.evidence,
    failure_code: row.failure_code,
    failure_message: row.failure_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function createSupabasePostWriteVerificationRepository(): PostWriteVerificationRepository {
  return {
    async listByExecutionPolicy(args) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("journal_entry_post_write_verifications")
        .select(COLUMNS)
        .eq("execution_id", args.executionId)
        .eq("policy_hash", args.policyHash);
      if (error) {
        throw new PostWriteVerificationError(
          "je4_run_load_failed",
          error.message,
        );
      }
      const rows = (data || []) as unknown[];
      return rows.map((row) => asRow(row as Record<string, unknown>));
    },
    async insert(row) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("journal_entry_post_write_verifications")
        .insert(toDb(row))
        .select(COLUMNS)
        .maybeSingle();
      if (error) {
        if (isUniqueViolation(error)) {
          throw new PostWriteVerificationError(
            "je4_idempotency_conflict",
            "Post-write verification row already exists for this idempotency key.",
          );
        }
        throw new PostWriteVerificationError("je4_run_insert_failed", error.message);
      }
      if (!data) {
        throw new PostWriteVerificationError(
          "je4_run_insert_failed",
          "Post-write verification insert returned no row.",
        );
      }
      return asRow(data as unknown as Record<string, unknown>);
    },
    async update(row) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("journal_entry_post_write_verifications")
        .update(toDb(row))
        .eq("id", row.id)
        .eq("execution_id", row.execution_id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) {
        throw new PostWriteVerificationError("je4_run_update_failed", error.message);
      }
      if (!data) {
        throw new PostWriteVerificationError(
          "je4_run_update_failed",
          "Post-write verification update returned no row.",
        );
      }
      return asRow(data as unknown as Record<string, unknown>);
    },
  };
}
