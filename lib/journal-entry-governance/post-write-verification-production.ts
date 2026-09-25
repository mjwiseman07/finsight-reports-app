/**
 * Production dependencies for JE-4.
 *
 * Read and persist paths only: authoritative FRESH_CAPTURE, canonical sync
 * load, and Continuous Close REPLAY_EXISTING_SYNC. This module must not import
 * the provider journal-entry create transport or a live tie-out regeneration worker.
 *
 * runProductionPostWriteVerification refuses while the JE-4 API gate is off.
 */

import { randomUUID } from "node:crypto";
import { runAuthoritativeArApInventoryObservation } from "@/lib/audit-ready/authoritative-observation/run-authoritative-ar-ap-inventory-observation";
import type { ContinuousCloseObservePolicy } from "@/lib/continuous-close/policy";
import { runAndPersistAuthoritativeObserve } from "@/lib/continuous-close/persistence/run-and-persist-observe";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  JeApprovalCustodyError,
  loadExactJournalEntryProposal,
} from "./approval-custody";
import { loadExactExecution } from "./provider-attempt-service";
import { extractPostWriteCanonicalEvidence } from "./post-write-verification-canonical";
import { assertJe4ApiTriggerEnabled } from "./post-write-verification-feature-gate";
import { createSupabasePostWriteVerificationRepository } from "./post-write-verification-repository";
import {
  runPostWriteVerification,
  type PostWriteVerificationDeps,
  type RunPostWriteVerificationInput,
} from "./post-write-verification-service";
import {
  PostWriteVerificationError,
  type PostWriteVerificationResult,
} from "./post-write-verification-types";
import type {
  PriorLedgerEventCustody,
  VerificationLedgerEventCustody,
} from "./verified-memory-projection-custody";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }
  return value;
}

export function parseStoredObservePolicy(
  snapshot: unknown,
): ContinuousCloseObservePolicy | null {
  const row = asRecord(snapshot);
  if (!row || row.mode !== "OBSERVE") return null;
  const assertion = asRecord(row.assertion);
  const evidence = asRecord(row.evidence);
  const urm = asRecord(row.urm);
  if (!assertion || !evidence || !urm) return null;
  const requiredReconKinds = stringList(row.requiredReconKinds);
  const optionalReconKinds = stringList(row.optionalReconKinds);
  const statementControlRequiredKeys = stringList(row.statementControlRequiredKeys);
  const statementControlOptionalKeys = stringList(row.statementControlOptionalKeys);
  const requiredBlockOutcomes = stringList(urm.requiredBlockOutcomes);
  const requiredReviewOutcomes = stringList(urm.requiredReviewOutcomes);
  const optionalBlockOutcomes = stringList(urm.optionalBlockOutcomes);
  const optionalReviewOutcomes = stringList(urm.optionalReviewOutcomes);
  if (
    !requiredReconKinds ||
    !optionalReconKinds ||
    !statementControlRequiredKeys ||
    !statementControlOptionalKeys ||
    !requiredBlockOutcomes ||
    !requiredReviewOutcomes ||
    !optionalBlockOutcomes ||
    !optionalReviewOutcomes ||
    typeof row.requireStatementControlSnapshotWhenContracted !== "boolean" ||
    typeof row.requireUrmSourceSyncMatch !== "boolean" ||
    typeof assertion.gapsRequireReview !== "boolean" ||
    typeof evidence.requireEvidenceForReconciled !== "boolean" ||
    typeof evidence.minEvidenceCountForReconciled !== "number" ||
    (row.freshnessMaxAgeHours != null && typeof row.freshnessMaxAgeHours !== "number") ||
    (assertion.blockGapRate != null && typeof assertion.blockGapRate !== "number")
  ) {
    return null;
  }
  return {
    mode: "OBSERVE",
    requireStatementControlSnapshotWhenContracted:
      row.requireStatementControlSnapshotWhenContracted,
    statementControlRequiredKeys,
    statementControlOptionalKeys,
    requiredReconKinds,
    optionalReconKinds,
    assertion: {
      gapsRequireReview: assertion.gapsRequireReview,
      blockGapRate: assertion.blockGapRate == null ? null : Number(assertion.blockGapRate),
    },
    urm: {
      requiredBlockOutcomes,
      requiredReviewOutcomes,
      optionalBlockOutcomes,
      optionalReviewOutcomes,
    },
    evidence: {
      requireEvidenceForReconciled: evidence.requireEvidenceForReconciled,
      minEvidenceCountForReconciled: evidence.minEvidenceCountForReconciled,
    },
    requireUrmSourceSyncMatch: row.requireUrmSourceSyncMatch,
    freshnessMaxAgeHours:
      row.freshnessMaxAgeHours == null ? null : Number(row.freshnessMaxAgeHours),
  } as ContinuousCloseObservePolicy;
}

async function loadVerificationReceipt(
  eventId: string,
): Promise<VerificationLedgerEventCustody | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select(
      "event_id, event_type, event_hash, previous_event_hash, chain_index, firm_client_id, engagement_id, aggregate_type, aggregate_id, event_payload",
    )
    .eq("event_id", eventId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    event_id: String(data.event_id),
    event_type: String(data.event_type),
    event_hash: data.event_hash ? String(data.event_hash) : null,
    previous_event_hash: data.previous_event_hash
      ? String(data.previous_event_hash)
      : null,
    chain_index: data.chain_index == null ? null : Number(data.chain_index),
    firm_client_id: data.firm_client_id ? String(data.firm_client_id) : null,
    engagement_id: data.engagement_id ? String(data.engagement_id) : null,
    aggregate_type: data.aggregate_type ? String(data.aggregate_type) : null,
    aggregate_id: data.aggregate_id ? String(data.aggregate_id) : null,
    event_payload: (data.event_payload as Record<string, unknown> | null) ?? {},
  };
}

async function loadPriorLedgerEvent(
  eventHash: string,
): Promise<PriorLedgerEventCustody | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select("event_id, event_hash, chain_index")
    .eq("event_hash", eventHash)
    .maybeSingle();
  if (error || !data?.event_id || !data?.event_hash) return null;
  return {
    event_id: String(data.event_id),
    event_hash: String(data.event_hash),
    chain_index: data.chain_index == null ? null : Number(data.chain_index),
  };
}

export function createProductionPostWriteVerificationDeps(): PostWriteVerificationDeps {
  return {
    loadExecution: loadExactExecution,
    loadVerificationReceipt,
    loadPriorLedgerEvent,
    async loadProposal(proposalId) {
      try {
        return await loadExactJournalEntryProposal(proposalId);
      } catch (error) {
        if (error instanceof JeApprovalCustodyError) return null;
        throw error;
      }
    },
    async loadSourceReconKinds(runIds) {
      if (runIds.length === 0) return [];
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("audit_ready_tie_out_runs")
        .select("id, tie_out_kind")
        .in("id", [...runIds]);
      if (error) {
        throw new PostWriteVerificationError(
          "je4_source_recon_lookup_failed",
          error.message,
        );
      }
      const rows = (data || []) as Array<{ tie_out_kind?: string | null }>;
      if (rows.length !== runIds.length) {
        throw new PostWriteVerificationError(
          "je4_source_recon_lookup_failed",
          "One or more proposal source recon runs were not found.",
        );
      }
      return rows.map((row) => String(row.tie_out_kind || "")).filter(Boolean);
    },
    async loadObservePolicy(args) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("continuous_close_runs")
        .select("id, company_id, engagement_id, mode, policy_snapshot")
        .eq("id", args.sourceContinuousCloseRunId)
        .maybeSingle();
      if (error || !data) return null;
      if (String(data.company_id) !== args.companyId) return null;
      if (String(data.engagement_id) !== args.engagementId) return null;
      if (String(data.mode) !== "OBSERVE") return null;
      return parseStoredObservePolicy(data.policy_snapshot);
    },
    runObservation: runAuthoritativeArApInventoryObservation,
    async loadCanonicalEvidence(args) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("accounting_syncs")
        .select(
          "id, company_id, connection_id, report_period_end, validation_status, last_synced_at, normalized_payload",
        )
        .eq("id", args.accountingSyncId)
        .maybeSingle();
      if (error || !data) return null;
      return extractPostWriteCanonicalEvidence({
        accountingSyncId: String(data.id),
        companyId: data.company_id ? String(data.company_id) : null,
        connectionId: data.connection_id ? String(data.connection_id) : null,
        periodEnd: data.report_period_end ? String(data.report_period_end) : null,
        validationStatus: data.validation_status ? String(data.validation_status) : null,
        syncedAt: data.last_synced_at ? String(data.last_synced_at) : null,
        providerJournalId: args.providerJournalId,
        normalizedPayload: data.normalized_payload,
      });
    },
    runObserve: runAndPersistAuthoritativeObserve,
    repository: createSupabasePostWriteVerificationRepository(),
    newId: () => randomUUID(),
    nowIso: () => new Date().toISOString(),
  };
}

export async function runProductionPostWriteVerification(
  input: RunPostWriteVerificationInput,
): Promise<PostWriteVerificationResult> {
  assertJe4ApiTriggerEnabled();
  return runPostWriteVerification(input, createProductionPostWriteVerificationDeps());
}
