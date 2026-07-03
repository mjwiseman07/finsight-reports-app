/**
 * D4 Proposal Service — scan orchestration, DB persistence, reviewer actions,
 * D2 JE posting, and D3 memory reinforcement.
 */
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { upsertMemory } from "@/lib/memory/client-memory-service";
import { wilsonScoreLower } from "@/lib/learning/confidence";
import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";
import type { JEPayload } from "@/lib/erp/types";
import { findUncategorizedTxns } from "@/lib/learning/uncategorized-detector";
import { composeProposals } from "@/lib/learning/proposal-composer";
import type {
  AcceptProposalInput,
  AcceptProposalResponse,
  BulkAcceptInput,
  BulkAcceptResponse,
  ModifyProposalInput,
  RejectProposalInput,
  ScanResponse,
  SkipProposalInput,
  UncategorizedProposal,
  UncategorizedProposalSource,
} from "@/lib/learning/types-d4";

const BULK_POST_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultSince(): string {
  return new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
}

function countByBucket(proposals: Array<{ confidence_bucket: string }>) {
  return proposals.reduce(
    (acc, p) => {
      if (p.confidence_bucket === "green") acc.green += 1;
      else if (p.confidence_bucket === "yellow") acc.yellow += 1;
      else acc.red += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 },
  );
}

function countBySource(proposals: Array<{ source: UncategorizedProposalSource }>) {
  const init: Record<UncategorizedProposalSource, number> = {
    vendor_gl_mapping: 0,
    recurring_pattern: 0,
    amount_range: 0,
    no_pattern: 0,
  };
  for (const p of proposals) init[p.source] += 1;
  return init;
}

async function reinforceVendorGL(
  firmClientId: string,
  vendorId: string,
  accountId: string,
  vendorName: string,
  accountName: string,
  positive: boolean,
): Promise<void> {
  const memoryId = `mem_${firmClientId}_vendor_gl_${vendorId}_${accountId}`;
  const supabase = getSupabaseAdmin();
  const { data: fc } = await supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (!fc?.company_id) return;

  const { data: existing } = await supabase
    .from("company_memory_records")
    .select("payload")
    .eq("memory_id", memoryId)
    .maybeSingle();

  const prev = (existing?.payload as Record<string, unknown>) ?? {};
  const sample_count = (Number(prev.sample_count) || 0) + 1;
  const matching_count = (Number(prev.matching_count) || 0) + (positive ? 1 : 0);
  const confidence = wilsonScoreLower(matching_count, sample_count);
  const weak = matching_count < 3 || confidence < 0.5;

  await upsertMemory({
    firmClientId,
    memoryType: "vendor_gl_mapping",
    memoryId,
    entityType: "vendor",
    entityId: vendorId,
    confidenceScore: confidence,
    payload: {
      vendor_id: vendorId,
      vendor_name: vendorName || (prev.vendor_name as string) || "",
      account_id: accountId,
      account_name: accountName || (prev.account_name as string) || "",
      sample_count,
      matching_count,
      confidence: Number(confidence.toFixed(3)),
      weak,
      first_seen_date: (prev.first_seen_date as string) ?? new Date().toISOString().slice(0, 10),
      last_seen_date: new Date().toISOString().slice(0, 10),
      source: "forward",
    },
  });
}

function buildReclassPayload(
  proposal: UncategorizedProposal,
  finalAccountId: string,
): JEPayload {
  return {
    transaction_date: proposal.txn_date,
    private_note: `D4 reclass ${proposal.txn_type} ${proposal.txn_id}`,
    lines: [
      {
        account_id: finalAccountId,
        amount: proposal.txn_amount,
        posting_type: "Debit",
        description: proposal.txn_memo ?? undefined,
      },
      {
        account_id: proposal.current_account_id,
        amount: proposal.txn_amount,
        posting_type: "Credit",
        description: proposal.txn_memo ?? undefined,
      },
    ],
  };
}

async function getProposal(proposalId: string): Promise<UncategorizedProposal> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("uncategorized_proposals")
    .select("*")
    .eq("proposal_id", proposalId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("proposal_not_found");
  return data as UncategorizedProposal;
}

export async function runUncategorizedScan(
  firmClientId: string,
  since?: string,
): Promise<ScanResponse> {
  const start = performance.now();
  const runId = randomUUID();
  const sinceDate = since ?? defaultSince();
  const startedAt = new Date().toISOString();

  await upsertMemory({
    firmClientId,
    memoryType: "scan_run",
    memoryId: `mem_${firmClientId}_scan_run_${runId}`,
    payload: {
      run_id: runId,
      started_at: startedAt,
      completed_at: null,
      txn_count: 0,
      proposals_created: 0,
      proposals_reinforced: 0,
      source: "uncategorized_scan",
      errors: [],
    },
  });

  const detectorOutput = await findUncategorizedTxns({ firmClientId, since: sinceDate });
  const composed = await composeProposals({
    firmClientId,
    scanRunId: runId,
    txns: detectorOutput.txns,
  });

  const supabase = getSupabaseAdmin();
  let inserted = 0;
  for (const row of composed) {
    const { error } = await supabase.from("uncategorized_proposals").insert(row);
    if (error) {
      if (error.code === "23505") continue; // open proposal already exists
      throw new Error(`proposal insert failed: ${error.message}`);
    }
    inserted += 1;
  }

  const completedAt = new Date().toISOString();
  await upsertMemory({
    firmClientId,
    memoryType: "scan_run",
    memoryId: `mem_${firmClientId}_scan_run_${runId}`,
    payload: {
      run_id: runId,
      started_at: startedAt,
      completed_at: completedAt,
      txn_count: detectorOutput.txns.length,
      proposals_created: inserted,
      proposals_reinforced: 0,
      source: "uncategorized_scan",
      errors: [],
    },
  });

  return {
    run_id: runId,
    proposals_generated: inserted,
    by_bucket: countByBucket(composed),
    by_source: countBySource(composed),
    duration_ms: Math.round(performance.now() - start),
  };
}

export async function listProposals(
  firmClientId: string,
  opts?: { status?: string; bucket?: string; limit?: number },
): Promise<UncategorizedProposal[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("uncategorized_proposals")
    .select("*")
    .eq("firm_client_id", firmClientId)
    .order("txn_date", { ascending: false });

  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.bucket) q = q.eq("confidence_bucket", opts.bucket);
  const limit = Math.min(opts?.limit ?? 100, 200);

  const { data, error } = await q.limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as UncategorizedProposal[];
}

export async function acceptProposal(
  proposalId: string,
  reviewerUserId: string,
  input: AcceptProposalInput = {},
): Promise<AcceptProposalResponse> {
  const proposal = await getProposal(proposalId);
  if (proposal.status !== "pending") throw new Error("proposal_not_pending");

  const finalAccountId = input.final_account_id ?? proposal.suggested_account_id;
  if (!finalAccountId) throw new Error("no_final_account");

  const isModified =
    proposal.suggested_account_id != null && finalAccountId !== proposal.suggested_account_id;
  const idempotencyKey = `d4_accept_${proposalId}`;

  const postResult = await qboJournalEntryPoster.post({
    firm_client_id: proposal.firm_client_id,
    idempotency_key: idempotencyKey,
    source_type: "rule",
    source_id: proposalId,
    posted_by: "human",
    posted_by_user_id: reviewerUserId,
    payload: buildReclassPayload(proposal, finalAccountId),
  });

  const supabase = getSupabaseAdmin();
  const decidedAt = new Date().toISOString();

  if (postResult.status === "rejected" && postResult.reason === "cash_basis_notes_only") {
    await supabase
      .from("uncategorized_proposals")
      .update({
        status: "accepted",
        reviewer_user_id: reviewerUserId,
        decided_at: decidedAt,
        final_account_id: finalAccountId,
        final_account_name: proposal.suggested_account_name,
        posted_je_id: null,
      })
      .eq("proposal_id", proposalId);

    if (proposal.vendor_id) {
      await reinforceVendorGL(
        proposal.firm_client_id,
        proposal.vendor_id,
        finalAccountId,
        proposal.vendor_name ?? "",
        proposal.suggested_account_name ?? "",
        true,
      );
    }

    return {
      status: "cash_basis",
      proposal_id: proposalId,
      posted_je_id: null,
      reason: "cash_basis_notes_only",
    };
  }

  if (postResult.status !== "posted") {
    return {
      status: "rejected_by_d2",
      proposal_id: proposalId,
      reason: postResult.status === "rejected" ? postResult.reason : postResult.error,
    };
  }

  await supabase
    .from("uncategorized_proposals")
    .update({
      status: isModified ? "modified" : "accepted",
      reviewer_user_id: reviewerUserId,
      decided_at: decidedAt,
      final_account_id: finalAccountId,
      final_account_name: proposal.suggested_account_name,
      posted_je_id: postResult.attempt_id,
    })
    .eq("proposal_id", proposalId);

  if (proposal.vendor_id) {
    if (isModified && proposal.suggested_account_id) {
      await reinforceVendorGL(
        proposal.firm_client_id,
        proposal.vendor_id,
        proposal.suggested_account_id,
        proposal.vendor_name ?? "",
        proposal.suggested_account_name ?? "",
        false,
      );
    }
    await reinforceVendorGL(
      proposal.firm_client_id,
      proposal.vendor_id,
      finalAccountId,
      proposal.vendor_name ?? "",
      proposal.suggested_account_name ?? "",
      true,
    );
  }

  return {
    status: "accepted",
    proposal_id: proposalId,
    posted_je_id: postResult.attempt_id,
    final_account_id: finalAccountId,
  };
}

export async function rejectProposal(
  proposalId: string,
  reviewerUserId: string,
  input: RejectProposalInput,
): Promise<void> {
  const proposal = await getProposal(proposalId);
  if (proposal.status !== "pending") throw new Error("proposal_not_pending");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("uncategorized_proposals")
    .update({
      status: "rejected",
      reviewer_user_id: reviewerUserId,
      decided_at: new Date().toISOString(),
      reject_reason: input.reject_reason,
    })
    .eq("proposal_id", proposalId);
  if (error) throw new Error(error.message);

  if (proposal.vendor_id && proposal.suggested_account_id) {
    await reinforceVendorGL(
      proposal.firm_client_id,
      proposal.vendor_id,
      proposal.suggested_account_id,
      proposal.vendor_name ?? "",
      proposal.suggested_account_name ?? "",
      false,
    );
  }
}

export async function modifyProposal(
  proposalId: string,
  reviewerUserId: string,
  input: ModifyProposalInput,
): Promise<AcceptProposalResponse> {
  return acceptProposal(proposalId, reviewerUserId, { final_account_id: input.final_account_id });
}

export async function skipProposal(
  proposalId: string,
  reviewerUserId: string,
  input: SkipProposalInput = {},
): Promise<void> {
  const proposal = await getProposal(proposalId);
  if (proposal.status !== "pending") throw new Error("proposal_not_pending");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("uncategorized_proposals")
    .update({
      status: "skipped",
      reviewer_user_id: reviewerUserId,
      decided_at: new Date().toISOString(),
      reject_reason: input.skip_reason ?? null,
    })
    .eq("proposal_id", proposalId);
  if (error) throw new Error(error.message);
}

export async function bulkAcceptProposals(
  reviewerUserId: string,
  input: BulkAcceptInput,
): Promise<BulkAcceptResponse> {
  const supabase = getSupabaseAdmin();
  const batchId = `bulk_${randomUUID()}`;

  const { data: rows, error } = await supabase
    .from("uncategorized_proposals")
    .select("*")
    .in("proposal_id", input.proposal_ids);
  if (error) throw new Error(error.message);

  const proposals = (rows ?? []) as UncategorizedProposal[];
  if (proposals.length !== input.proposal_ids.length) {
    throw new Error("some_proposals_not_found");
  }

  const nonPending = proposals.filter((p) => p.status !== "pending");
  if (nonPending.length > 0) throw new Error("all_proposals_must_be_pending");

  const nonGreen = proposals.filter((p) => p.confidence_bucket !== "green");
  if (nonGreen.length > 0) {
    throw new Error("bulk_accept_requires_green_bucket_only");
  }

  const results: BulkAcceptResponse["results"] = [];
  let accepted = 0;
  let failed = 0;

  for (let i = 0; i < proposals.length; i++) {
    if (i > 0) await sleep(BULK_POST_DELAY_MS);
    const proposal = proposals[i];
    const idempotencyKey = `d4_bulk_${batchId}_${proposal.proposal_id}`;

    const postResult = await qboJournalEntryPoster.post({
      firm_client_id: proposal.firm_client_id,
      idempotency_key: idempotencyKey,
      source_type: "rule",
      source_id: batchId,
      posted_by: "human",
      posted_by_user_id: reviewerUserId,
      payload: buildReclassPayload(proposal, proposal.suggested_account_id!),
    });

    const decidedAt = new Date().toISOString();

    if (postResult.status === "rejected" && postResult.reason === "cash_basis_notes_only") {
      await supabase
        .from("uncategorized_proposals")
        .update({
          status: "accepted",
          reviewer_user_id: reviewerUserId,
          decided_at: decidedAt,
          final_account_id: proposal.suggested_account_id,
          final_account_name: proposal.suggested_account_name,
          posted_je_id: null,
        })
        .eq("proposal_id", proposal.proposal_id);

      if (proposal.vendor_id && proposal.suggested_account_id) {
        await reinforceVendorGL(
          proposal.firm_client_id,
          proposal.vendor_id,
          proposal.suggested_account_id,
          proposal.vendor_name ?? "",
          proposal.suggested_account_name ?? "",
          true,
        );
      }

      results.push({
        proposal_id: proposal.proposal_id,
        posted_je_id: null,
        status: "cash_basis",
      });
      accepted += 1;
      continue;
    }

    if (postResult.status !== "posted") {
      results.push({
        proposal_id: proposal.proposal_id,
        posted_je_id: null,
        status: "failed",
        error: postResult.status === "rejected" ? postResult.reason : postResult.error,
      });
      failed += 1;
      continue;
    }

    await supabase
      .from("uncategorized_proposals")
      .update({
        status: "accepted",
        reviewer_user_id: reviewerUserId,
        decided_at: decidedAt,
        final_account_id: proposal.suggested_account_id,
        final_account_name: proposal.suggested_account_name,
        posted_je_id: postResult.attempt_id,
      })
      .eq("proposal_id", proposal.proposal_id);

    if (proposal.vendor_id && proposal.suggested_account_id) {
      await reinforceVendorGL(
        proposal.firm_client_id,
        proposal.vendor_id,
        proposal.suggested_account_id,
        proposal.vendor_name ?? "",
        proposal.suggested_account_name ?? "",
        true,
      );
    }

    results.push({
      proposal_id: proposal.proposal_id,
      posted_je_id: postResult.attempt_id,
      status: "posted",
    });
    accepted += 1;
  }

  return { batch_id: batchId, accepted, failed, results };
}
