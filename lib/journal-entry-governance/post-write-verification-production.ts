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
import {
  extractPostWriteCanonicalEvidence,
  type PostWriteTieOutProofRow,
} from "./post-write-verification-canonical";
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

function proofCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function proofText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

/**
 * Read tie-out proof columns for the execution's engagement and period.
 * Sync-backed run ids come from the observation slots. BS rows are selected
 * by engagement, period, completed live-provider custody, and artifact
 * account — not by caller-supplied company, sync, or run ids.
 * gl_total_cents and gl_ending_balance_cents are not selected.
 */
export async function loadProductionPostWriteProofRows(args: {
  engagementId: string;
  periodEnd: string;
  accountingSyncId: string;
  verifiedAt: string;
  syncBackedRunIds: readonly string[];
  glAccountIds: readonly string[];
}): Promise<PostWriteTieOutProofRow[]> {
  const accountingSyncId = String(args.accountingSyncId || "").trim();
  if (!accountingSyncId) {
    throw new PostWriteVerificationError(
      "je4_effect_proof_load_failed",
      "Post-write effect proof requires the custody accounting sync id.",
    );
  }
  const supabase = getSupabaseAdmin();
  const periodEnd = String(args.periodEnd || "").slice(0, 10);
  const engagementId = String(args.engagementId || "").trim();
  const rows: PostWriteTieOutProofRow[] = [];

  const runIds = [...new Set(args.syncBackedRunIds.map((id) => String(id || "").trim()).filter(Boolean))];
  if (runIds.length > 0) {
    const { data, error } = await supabase
      .from("audit_ready_tie_out_runs")
      .select(
        "id, engagement_id, period_end, tie_out_kind, status, recon_outcome, " +
          "baseline_sync_id, unidentified_residual_cents, totals_status, " +
          "totals_variance_cents, completed_at",
      )
      .eq("engagement_id", engagementId)
      .eq("period_end", periodEnd)
      .in("id", runIds);
    if (error) {
      throw new PostWriteVerificationError("je4_effect_proof_load_failed", error.message);
    }
    for (const row of data || []) {
      rows.push({
        id: String(row.id),
        engagementId: String(row.engagement_id || ""),
        periodEnd: row.period_end ? String(row.period_end).slice(0, 10) : "",
        tieOutKind: String(row.tie_out_kind || ""),
        status: String(row.status || ""),
        reconOutcome: proofText(row.recon_outcome),
        baselineSyncId: proofText(row.baseline_sync_id),
        unidentifiedResidualCents: proofCents(row.unidentified_residual_cents),
        totalsStatus: proofText(row.totals_status),
        totalsVarianceCents: proofCents(row.totals_variance_cents),
        subledgerTotalCents: null,
        glTotalCents: null,
        completedAt: proofText(row.completed_at),
        qboAccountId: null,
        endingBalanceCents: null,
        glEndingBalanceCents: null,
      });
    }
  }

  const glAccountIds = [
    ...new Set(args.glAccountIds.map((id) => String(id || "").trim()).filter(Boolean)),
  ];
  if (glAccountIds.length === 0) return rows;

  const { data: bsRuns, error: bsError } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, period_end, tie_out_kind, status, recon_outcome, " +
        "baseline_sync_id, unidentified_residual_cents, totals_status, " +
        "subledger_total_cents, completed_at",
    )
    .eq("engagement_id", engagementId)
    .eq("period_end", periodEnd)
    .eq("tie_out_kind", "bs_account_recon")
    .eq("status", "completed")
    .is("baseline_sync_id", null)
    .gte("completed_at", args.verifiedAt);
  if (bsError) {
    throw new PostWriteVerificationError("je4_effect_proof_load_failed", bsError.message);
  }
  const runs = (bsRuns || []) as Array<{
    id?: unknown;
    engagement_id?: unknown;
    period_end?: unknown;
    tie_out_kind?: unknown;
    status?: unknown;
    recon_outcome?: unknown;
    baseline_sync_id?: unknown;
    unidentified_residual_cents?: unknown;
    totals_status?: unknown;
    subledger_total_cents?: unknown;
    completed_at?: unknown;
  }>;
  const bsRunIds = runs.map((run) => String(run.id || "")).filter(Boolean);
  if (bsRunIds.length === 0) return rows;

  const { data: artifacts, error: artifactError } = await supabase
    .from("audit_ready_bs_recon_artifacts")
    .select("run_id, qbo_account_id, ending_balance_cents, engagement_id, period_end")
    .eq("engagement_id", engagementId)
    .eq("period_end", periodEnd)
    .in("run_id", bsRunIds)
    .in("qbo_account_id", glAccountIds);
  if (artifactError) {
    throw new PostWriteVerificationError(
      "je4_effect_proof_load_failed",
      artifactError.message,
    );
  }

  const artifactsByRun = new Map<string, Array<Record<string, unknown>>>();
  for (const artifact of artifacts || []) {
    const runId = String(artifact.run_id || "");
    const group = artifactsByRun.get(runId) || [];
    group.push(artifact as Record<string, unknown>);
    artifactsByRun.set(runId, group);
  }

  for (const run of runs) {
    const runArtifacts = artifactsByRun.get(String(run.id)) || [];
    for (const artifact of runArtifacts) {
      rows.push({
        id: String(run.id),
        engagementId: String(run.engagement_id || ""),
        periodEnd: run.period_end ? String(run.period_end).slice(0, 10) : "",
        tieOutKind: String(run.tie_out_kind || ""),
        status: String(run.status || ""),
        reconOutcome: proofText(run.recon_outcome),
        baselineSyncId: proofText(run.baseline_sync_id),
        unidentifiedResidualCents: proofCents(run.unidentified_residual_cents),
        totalsStatus: proofText(run.totals_status),
        totalsVarianceCents: null,
        subledgerTotalCents: proofCents(run.subledger_total_cents),
        glTotalCents: null,
        completedAt: proofText(run.completed_at),
        qboAccountId: proofText(artifact.qbo_account_id),
        endingBalanceCents: proofCents(artifact.ending_balance_cents),
        glEndingBalanceCents: null,
      });
    }
  }

  return rows;
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
    loadPostWriteProofRows: loadProductionPostWriteProofRows,
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
