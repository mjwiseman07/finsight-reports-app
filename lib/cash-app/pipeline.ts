/**
 * Layer 2 orchestration — wires feature scoring, tiered LLM, and Layer 4 review queue.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { publishEvent } from "@/lib/events/publisher";
import { publishCashAppEvent } from "./publish-cash-app-event";
import {
  computeLayer2FeatureScore,
  type FeatureBreakdown,
  type GlobalPatternHit,
  type HistoricalBehaviorInput,
} from "./layer2-features";
import { isGenericEnoughToPool } from "./payer-pattern-classifier";
import { reasonAboutMatches, type CandidateForReasoning } from "./layer2-reasoner";
import { createReviewItem } from "./review-queue";
import { getFirmLlmConfig } from "./firm-llm-config";
import { normalizePayerName } from "@/lib/ar-cash-app/normalization/payer-name";
import { resolveCurrencyForFirmClient } from "@/lib/erp/quickbooks/currency-resolver";
import type { TopCandidateSummary } from "./review-queue-types";

const LAYER2_PLAUSIBILITY_FLOOR = 0.35;

export interface PaymentRecord {
  id: string;
  payerNameRaw: string | null;
  amountReceived: number;
  currency: string;
  paymentDateIso: string;
  memoRaw: string | null;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string | null;
  amount: number;
  dueDate: string;
  currency: string;
}

function fingerprintEntity(normalizedName: string): string {
  return createHash("sha256").update(`generic-payer|${normalizedName}`).digest("hex");
}

async function lookupGlobalPattern(
  supabase: SupabaseClient,
  customerName: string | null,
  eligible: boolean,
): Promise<GlobalPatternHit> {
  if (!eligible || !customerName) {
    return { found: false, weight: 0, eligibleForPooling: false };
  }
  const normalized = normalizePayerName(customerName);
  if (!normalized) {
    return { found: false, weight: 0, eligibleForPooling: eligible };
  }
  const fingerprint = fingerprintEntity(normalized);
  const { data } = await supabase
    .from("cash_app_payer_patterns_global")
    .select("weight")
    .eq("pattern_fingerprint", fingerprint)
    .maybeSingle();
  if (!data) {
    return { found: false, weight: 0, eligibleForPooling: eligible };
  }
  return { found: true, weight: Number(data.weight), eligibleForPooling: eligible };
}

async function lookupHistoricalBehavior(
  supabase: SupabaseClient,
  tenantId: { firmId: string; companyId: string },
  payment: PaymentRecord,
  invoice: InvoiceRecord,
): Promise<HistoricalBehaviorInput> {
  const normPayer = normalizePayerName(payment.payerNameRaw);
  const { count: payerCount } = await supabase
    .from("ar_cash_app_payments")
    .select("id", { count: "exact", head: true })
    .eq("company_id", tenantId.companyId)
    .eq("customer_id", invoice.customerId)
    .eq("payer_name_normalized", normPayer)
    .neq("id", payment.id);

  const { count: reviewCount } = await supabase
    .from("ar_cash_app_review_items")
    .select("id", { count: "exact", head: true })
    .eq("company_id", tenantId.companyId)
    .eq("status", "resolved")
    .eq("resolved_action", "accept");

  const priorCount = (payerCount ?? 0) + (reviewCount ?? 0);
  return {
    hasPriorPaymentFromThisPayerToThisCustomer: (payerCount ?? 0) > 0,
    hasPriorMemoPatternResolvedToThisCustomer: (reviewCount ?? 0) > 0,
    priorResolutionCount: priorCount,
  };
}

function toTopCandidateSummary(entry: {
  invoice: InvoiceRecord;
  breakdown: FeatureBreakdown;
}): TopCandidateSummary {
  return {
    invoiceId: entry.invoice.id,
    invoiceNumber: entry.invoice.invoiceNumber,
    customerId: entry.invoice.customerId,
    customerName: entry.invoice.customerName ?? "",
    invoiceAmount: entry.invoice.amount,
    invoiceDueDate: entry.invoice.dueDate,
    fuzzyPayerNameScore: entry.breakdown.fuzzyPayerNameScore,
    amountToleranceScore: entry.breakdown.amountToleranceScore,
    dateProximityScore: entry.breakdown.dateProximityScore,
    historicalPayerBehaviorScore: entry.breakdown.historicalPayerBehaviorScore,
    globalPatternScore: entry.breakdown.globalPatternScore,
    aggregateFeatureScore: entry.breakdown.aggregateScore,
  };
}

export async function runLayer2ForUnmatchedPayment(
  supabase: SupabaseClient,
  payment: PaymentRecord,
  candidateInvoices: InvoiceRecord[],
  tenantId: { firmId: string; companyId: string },
): Promise<void> {
  if (candidateInvoices.length === 0) {
    await createReviewItem({
      supabase,
      paymentId: payment.id,
      topCandidates: [],
      llmReasoningExcerpt: null,
      llmConfidence: null,
      tenantId,
    });
    await publishCashAppEvent(
      "cash_app.layer2_dropped_to_review",
      { firmId: tenantId.firmId, companyId: tenantId.companyId },
      "ar_cash_app_payment",
      payment.id,
      { payment_id: payment.id, reason: "no_candidate_invoices" },
    );
    return;
  }

  // MC-4a (Gap C-1): Currency-equality gate. Layer 1 already filters same-currency
  // invoices before returning; Layer 2 receives whatever the upstream orchestrator
  // supplied. Enforce here as a defense-in-depth precondition so cross-currency
  // false auto-matches are structurally impossible in the probabilistic path.
  const sameCurrencyInvoices = candidateInvoices.filter(
    (inv) => inv.currency === payment.currency,
  );
  const mismatchCount = candidateInvoices.length - sameCurrencyInvoices.length;

  if (sameCurrencyInvoices.length === 0) {
    await createReviewItem({
      supabase,
      paymentId: payment.id,
      topCandidates: [],
      llmReasoningExcerpt: null,
      llmConfidence: null,
      tenantId,
    });
    await publishCashAppEvent(
      "cash_app.layer2_dropped_to_review",
      { firmId: tenantId.firmId, companyId: tenantId.companyId },
      "ar_cash_app_payment",
      payment.id,
      {
        payment_id: payment.id,
        reason: "currency_mismatch",
        payment_currency: payment.currency,
        mismatch_count: mismatchCount,
      },
    );
    return;
  }

  const scoringCandidates = sameCurrencyInvoices.map((inv) => ({
    invoiceId: inv.id,
    invoiceBalance: inv.amount,
    invoiceDateIso: inv.dueDate,
    customerNameRaw: inv.customerName,
  }));

  const historicalCache = new Map<string, HistoricalBehaviorInput>();
  const globalCache = new Map<string, GlobalPatternHit>();

  for (const inv of sameCurrencyInvoices) {
    const eligible = isGenericEnoughToPool(payment.payerNameRaw, inv.customerName);
    historicalCache.set(
      inv.id,
      await lookupHistoricalBehavior(supabase, tenantId, payment, inv),
    );
    globalCache.set(inv.id, await lookupGlobalPattern(supabase, inv.customerName, eligible));
    const hit = globalCache.get(inv.id)!;
    if (hit.found && hit.eligibleForPooling) {
      await publishCashAppEvent(
        "cash_app.pattern_matched",
        { firmId: tenantId.firmId, companyId: tenantId.companyId },
        "cash_app_payer_pattern_global",
        normalizePayerName(inv.customerName) ?? inv.id,
        { invoice_id: inv.id, weight: hit.weight },
      );
    }
  }

  const breakdowns = computeLayer2FeatureScore(
    scoringCandidates,
    {
      payerNameRaw: payment.payerNameRaw,
      amountReceived: payment.amountReceived,
      paymentDateIso: payment.paymentDateIso,
    },
    (invoiceId) => historicalCache.get(invoiceId)!,
    (candidate) => globalCache.get(candidate.invoiceId)!,
  );

  const scored = sameCurrencyInvoices.map((invoice, i) => ({
    invoice,
    breakdown: breakdowns[i],
  }));
  scored.sort((a, b) => b.breakdown.aggregateScore - a.breakdown.aggregateScore);

  const topCandidates = scored.slice(0, 5);
  const anyPlausible = topCandidates.some(
    (c) => c.breakdown.aggregateScore >= LAYER2_PLAUSIBILITY_FLOOR,
  );

  if (!anyPlausible) {
    await createReviewItem({
      supabase,
      paymentId: payment.id,
      topCandidates: topCandidates.map(toTopCandidateSummary),
      llmReasoningExcerpt: null,
      llmConfidence: null,
      tenantId,
    });
    await publishCashAppEvent(
      "cash_app.layer2_dropped_to_review",
      { firmId: tenantId.firmId, companyId: tenantId.companyId },
      "ar_cash_app_payment",
      payment.id,
      { payment_id: payment.id, reason: "below_plausibility_floor" },
    );
    return;
  }

  const firmConfig = await getFirmLlmConfig(supabase, tenantId);

  const reasoningCandidates: CandidateForReasoning[] = topCandidates.map((c) => ({
    invoiceId: c.invoice.id,
    docNumber: c.invoice.invoiceNumber,
    balance: c.invoice.amount,
    currency: c.invoice.currency,
    invoiceDateIso: c.invoice.dueDate,
    customerId: c.invoice.customerId,
    customerName: c.invoice.customerName,
  }));

  const featureBreakdowns = topCandidates.map((c) => c.breakdown);

  // MC-4d: Resolve entity home currency for CURRENCY_SCOPE. Best-effort fallback
  // to payment.currency if MC-3 resolver is unavailable (never throws by contract,
  // but catch transient failures so Layer-2 remains available).
  let homeCurrency = payment.currency;
  try {
    const resolved = await resolveCurrencyForFirmClient(
      supabase,
      tenantId.companyId,
      undefined,
    );
    if (resolved.ok) {
      homeCurrency = resolved.home_currency;
    }
  } catch {
    // best-effort fallback — Layer-2 remains available if MC-3 resolver is transiently unavailable
  }

  const result = await reasonAboutMatches(
    {
      id: payment.id,
      amountReceived: payment.amountReceived,
      currency: payment.currency,
      payerNameRaw: payment.payerNameRaw,
      paymentDateIso: payment.paymentDateIso,
      memoRaw: payment.memoRaw,
    },
    reasoningCandidates,
    featureBreakdowns,
    tenantId,
    firmConfig,
    homeCurrency,
  );

  for (const entry of topCandidates) {
    await supabase.from("ar_cash_app_match_scores").insert({
      firm_id: tenantId.firmId,
      company_id: tenantId.companyId,
      payment_id: payment.id,
      invoice_id: entry.invoice.id,
      fuzzy_payer_name_score: entry.breakdown.fuzzyPayerNameScore,
      amount_tolerance_score: entry.breakdown.amountToleranceScore,
      date_proximity_score: entry.breakdown.dateProximityScore,
      historical_payer_behavior_score: entry.breakdown.historicalPayerBehaviorScore,
      global_pattern_score: entry.breakdown.globalPatternScore,
      global_pattern_contribution_capped: entry.breakdown.globalPatternCapped,
      aggregate_feature_score: entry.breakdown.aggregateScore,
      llm_tier_used: result.escalated ? firmConfig.layer2LlmEscalationTier : firmConfig.layer2LlmPrimaryTier,
      llm_confidence: result.finalConfidence,
      llm_reasoning_excerpt: result.toptierReasoning ?? result.primaryTierReasoning,
      llm_preferred_candidate: entry.invoice.id === result.preferredCandidateId,
      escalated_to_toptier: result.escalated,
      final_confidence: result.finalConfidence,
      verdict: result.verdict,
    });
  }

  if (result.verdict === "auto_match_candidate" && result.preferredCandidateId) {
    await publishEvent({
      eventType: "match_candidate_proposed",
      eventCategory: "cash_app",
      firmId: tenantId.firmId,
      aggregateType: "ar_cash_app_payment",
      aggregateId: payment.id,
      actorType: "ai_agent",
      payload: {
        payment_id: payment.id,
        invoice_id: result.preferredCandidateId,
        confidence: result.finalConfidence,
        source: "layer2_llm",
        llm_tier_used: result.escalated
          ? firmConfig.layer2LlmEscalationTier
          : firmConfig.layer2LlmPrimaryTier,
        company_id: tenantId.companyId,
      },
    });
    return;
  }

  await createReviewItem({
    supabase,
    paymentId: payment.id,
    topCandidates: topCandidates.map(toTopCandidateSummary),
    llmReasoningExcerpt: result.toptierReasoning ?? result.primaryTierReasoning,
    llmConfidence: result.finalConfidence,
    tenantId,
  });
}
