/**
 * Layer 4 review-queue read/write hook (D6.7 Part 2, Q2=C).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { publishCashAppEvent } from "./publish-cash-app-event";
import { isGenericEnoughToPool } from "./payer-pattern-classifier";
import { normalizePayerName } from "@/lib/ar-cash-app/normalization/payer-name";
import type { TopCandidateSummary } from "./review-queue-types";

export type { TopCandidateSummary };

export interface CreateReviewItemInput {
  supabase: SupabaseClient;
  paymentId: string;
  topCandidates: TopCandidateSummary[];
  llmReasoningExcerpt: string | null;
  llmConfidence: number | null;
  tenantId: { firmId: string; companyId: string };
}

export interface CreateReviewItemResult {
  reviewItemId: string;
}

export async function createReviewItem(
  input: CreateReviewItemInput,
): Promise<CreateReviewItemResult> {
  const { supabase, paymentId, topCandidates, llmReasoningExcerpt, llmConfidence, tenantId } =
    input;

  const { data, error } = await supabase
    .from("ar_cash_app_review_items")
    .insert({
      firm_id: tenantId.firmId,
      company_id: tenantId.companyId,
      payment_id: paymentId,
      top_candidates: topCandidates,
      llm_reasoning_excerpt: llmReasoningExcerpt,
      llm_confidence: llmConfidence,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create review item for payment ${paymentId}: ${error?.message}`);
  }

  await publishCashAppEvent(
    "cash_app.review_item_created",
    { firmId: tenantId.firmId, companyId: tenantId.companyId },
    "ar_cash_app_review_item",
    data.id,
    {
      payment_id: paymentId,
      candidate_count: topCandidates.length,
      llm_confidence: llmConfidence,
    },
  );

  return { reviewItemId: data.id };
}

export type ResolveAction = "accept" | "reject" | "write_off" | "on_account" | "split";

export interface AcceptPayload {
  action: "accept";
  invoiceId: string;
  matchedAmount: number;
}

export interface RejectPayload {
  action: "reject";
  reason: string;
}

export interface WriteOffPayload {
  action: "write_off";
  writeOffAmount: number;
  glAccountId: string;
  invoiceId: string;
}

export interface OnAccountPayload {
  action: "on_account";
  customerId: string;
}

export interface SplitAllocation {
  invoiceId: string;
  amount: number;
}

export interface SplitPayload {
  action: "split";
  splitAllocations: SplitAllocation[];
}

export type ResolvePayload =
  | AcceptPayload
  | RejectPayload
  | WriteOffPayload
  | OnAccountPayload
  | SplitPayload;

export interface ResolveReviewItemInput {
  supabase: SupabaseClient;
  reviewItemId: string;
  actorUserId: string;
  payload: ResolvePayload;
  tenantId: { firmId: string; companyId: string };
  payerContext?: { payerNameRaw: string | null; customerName: string | null };
}

export interface ResolveReviewItemResult {
  reviewItemId: string;
  resolvedAction: ResolveAction;
  contributedToGlobalPatterns: boolean;
}

function assertAllocationsWithinTolerance(allocations: SplitAllocation[], paymentAmount: number): void {
  const total = allocations.reduce((sum, a) => sum + a.amount, 0);
  const toleranceCents = 1;
  const diffCents = Math.round(Math.abs(total - paymentAmount) * 100);
  if (diffCents > toleranceCents) {
    throw new Error(
      `Split allocations total ${total.toFixed(2)} does not match payment amount ${paymentAmount.toFixed(2)} (diff ${diffCents}c > tolerance ${toleranceCents}c)`,
    );
  }
}

export async function resolveReviewItem(
  input: ResolveReviewItemInput,
): Promise<ResolveReviewItemResult> {
  const { supabase, reviewItemId, actorUserId, payload, tenantId, payerContext } = input;

  const { data: reviewItem, error: fetchErr } = await supabase
    .from("ar_cash_app_review_items")
    .select("id, payment_id, status")
    .eq("id", reviewItemId)
    .single();

  if (fetchErr || !reviewItem) {
    throw new Error(`Review item ${reviewItemId} not found: ${fetchErr?.message}`);
  }
  if (reviewItem.status !== "pending") {
    throw new Error(
      `Review item ${reviewItemId} is already ${reviewItem.status} — cannot resolve twice`,
    );
  }

  const updateFields: Record<string, unknown> = {
    status: "resolved",
    resolved_action: payload.action,
    resolved_by: actorUserId,
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (payload.action === "write_off") {
    updateFields.write_off_amount = payload.writeOffAmount;
    updateFields.write_off_gl_account_id = payload.glAccountId;
  } else if (payload.action === "on_account") {
    updateFields.on_account_customer_id = payload.customerId;
  } else if (payload.action === "split") {
    updateFields.split_allocations = payload.splitAllocations;
  } else if (payload.action === "reject") {
    updateFields.resolution_notes = payload.reason;
  }

  if (payload.action === "split") {
    const { data: payment } = await supabase
      .from("ar_cash_app_payments")
      .select("amount_received")
      .eq("id", reviewItem.payment_id)
      .single();
    if (payment) {
      assertAllocationsWithinTolerance(payload.splitAllocations, payment.amount_received);
    }
  }

  const { error: updateErr } = await supabase
    .from("ar_cash_app_review_items")
    .update(updateFields)
    .eq("id", reviewItemId);

  if (updateErr) {
    throw new Error(`Failed to resolve review item ${reviewItemId}: ${updateErr.message}`);
  }

  await publishCashAppEvent(
    "cash_app.review_item_resolved",
    { firmId: tenantId.firmId, companyId: tenantId.companyId },
    "ar_cash_app_review_item",
    reviewItemId,
    {
      resolved_action: payload.action,
      actor_user_id: actorUserId,
      payment_id: reviewItem.payment_id,
    },
    { actorType: "user", actorId: actorUserId },
  );

  let contributedToGlobalPatterns = false;
  if (payload.action === "accept" && payerContext) {
    const eligible = isGenericEnoughToPool(payerContext.payerNameRaw, payerContext.customerName);
    if (eligible) {
      contributedToGlobalPatterns = await contributeToGlobalPatterns(
        supabase,
        payerContext.customerName!,
        tenantId.firmId,
        tenantId.companyId,
      );
    }
  }

  return {
    reviewItemId,
    resolvedAction: payload.action,
    contributedToGlobalPatterns,
  };
}

function fingerprintEntity(normalizedName: string): string {
  return createHash("sha256").update(`generic-payer|${normalizedName}`).digest("hex");
}

async function contributeToGlobalPatterns(
  supabase: SupabaseClient,
  customerName: string,
  contributingFirmId: string,
  companyId: string,
): Promise<boolean> {
  const normalized = normalizePayerName(customerName);
  if (!normalized) return false;

  const fingerprint = fingerprintEntity(normalized);

  const { data: existing } = await supabase
    .from("cash_app_payer_patterns_global")
    .select("id, sample_count, contributing_tenant_ids")
    .eq("pattern_fingerprint", fingerprint)
    .maybeSingle();

  if (existing) {
    const tenantIds = existing.contributing_tenant_ids as string[];
    const alreadyContributed = tenantIds.includes(contributingFirmId);
    const newTenantIds = alreadyContributed ? tenantIds : [...tenantIds, contributingFirmId];
    await supabase
      .from("cash_app_payer_patterns_global")
      .update({
        sample_count: existing.sample_count + 1,
        contributing_tenant_ids: newTenantIds,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("cash_app_payer_patterns_global").insert({
      pattern_fingerprint: fingerprint,
      normalized_entity_name: normalized,
      sample_count: 1,
      contributing_tenant_ids: [contributingFirmId],
      weight: 0.1,
    });
  }

  await publishCashAppEvent(
    "cash_app.pattern_learned",
    { firmId: contributingFirmId, companyId },
    "cash_app_payer_pattern_global",
    fingerprint,
    { normalized_entity_name: normalized },
  );

  return true;
}
