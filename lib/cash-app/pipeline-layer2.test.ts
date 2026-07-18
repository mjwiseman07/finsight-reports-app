import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("./layer2-features", () => ({
  computeLayer2FeatureScore: vi.fn(),
}));
vi.mock("./payer-pattern-classifier", () => ({
  isGenericEnoughToPool: vi.fn(),
}));
vi.mock("./layer2-reasoner", () => ({
  reasonAboutMatches: vi.fn(),
}));
vi.mock("./review-queue", () => ({
  createReviewItem: vi.fn(),
}));
vi.mock("./firm-llm-config", () => ({
  getFirmLlmConfig: vi.fn(),
}));
vi.mock("./publish-cash-app-event", () => ({
  publishCashAppEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/erp/quickbooks/currency-resolver", () => ({
  resolveCurrencyForFirmClient: vi.fn().mockResolvedValue({
    ok: true,
    currency: "USD",
    home_currency: "USD",
    source: "home_currency_default",
  }),
}));

import { computeLayer2FeatureScore } from "./layer2-features";
import { isGenericEnoughToPool } from "./payer-pattern-classifier";
import { reasonAboutMatches } from "./layer2-reasoner";
import { createReviewItem } from "./review-queue";
import { getFirmLlmConfig } from "./firm-llm-config";
import { publishCashAppEvent } from "./publish-cash-app-event";
import { publishEvent } from "@/lib/events/publisher";
import { runLayer2ForUnmatchedPayment } from "./pipeline";

function makeSupabaseMock() {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.neq = self;
  chain.in = self;
  chain.insert = async () => ({ error: null });
  chain.maybeSingle = async () => ({ data: null });
  chain.single = async () => ({ data: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ count: 0 });
  return { from: () => chain };
}

const tenantId = { firmId: "firm-1", companyId: "co-1" };

const payment = {
  id: "pay-1",
  payerNameRaw: "MICROSOFT CORPORATION",
  amountReceived: 1000,
  currency: "USD",
  paymentDateIso: "2026-07-05",
  memoRaw: null,
};

function makeInvoice(
  overrides: Partial<{
    id: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    amount: number;
    dueDate: string;
    currency: string;
  }> = {},
) {
  return {
    id: "inv-1",
    invoiceNumber: "INV-001",
    customerId: "cust-1",
    customerName: "Microsoft Corp",
    amount: 1000,
    dueDate: "2026-06-01",
    currency: "USD",
    ...overrides,
  };
}

function mockBreakdown(aggregate: number) {
  return {
    invoiceId: "inv-1",
    fuzzyPayerNameScore: aggregate,
    amountToleranceScore: aggregate,
    dateProximityScore: aggregate,
    historicalPayerBehaviorScore: 0,
    globalPatternScore: 0,
    globalPatternCapped: false,
    aggregateScore: aggregate,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getFirmLlmConfig).mockResolvedValue({
    layer2EscalationThreshold: 0.75,
    layer2LlmPrimaryTier: "primary",
    layer2LlmEscalationTier: "toptier",
    crossTenantPatternContributionEnabled: true,
  });
  vi.mocked(isGenericEnoughToPool).mockReturnValue(false);
  vi.mocked(computeLayer2FeatureScore).mockReturnValue([mockBreakdown(0.1)]);
});

describe("runLayer2ForUnmatchedPayment orchestration", () => {
  test("no candidate invoices at all -> creates review item without calling feature scorer or LLM", async () => {
    const supabase = makeSupabaseMock();
    await runLayer2ForUnmatchedPayment(supabase as never, payment, [], tenantId);
    expect(computeLayer2FeatureScore).not.toHaveBeenCalled();
    expect(reasonAboutMatches).not.toHaveBeenCalled();
    expect(createReviewItem).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay-1", topCandidates: [] }),
    );
    expect(publishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.layer2_dropped_to_review",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ reason: "no_candidate_invoices" }),
    );
  });

  test("all candidates below plausibility floor -> drops to review without calling the LLM", async () => {
    vi.mocked(computeLayer2FeatureScore).mockReturnValue([mockBreakdown(0.1)]);
    const supabase = makeSupabaseMock();
    await runLayer2ForUnmatchedPayment(supabase as never, payment, [makeInvoice()], tenantId);
    expect(reasonAboutMatches).not.toHaveBeenCalled();
    expect(createReviewItem).toHaveBeenCalled();
    expect(publishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.layer2_dropped_to_review",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ reason: "below_plausibility_floor" }),
    );
  });

  test("plausible candidate + LLM high_confidence -> publishes match_candidate_proposed, no review item", async () => {
    vi.mocked(computeLayer2FeatureScore).mockReturnValue([mockBreakdown(0.9)]);
    vi.mocked(reasonAboutMatches).mockResolvedValue({
      verdict: "auto_match_candidate",
      preferredCandidateId: "inv-1",
      finalConfidence: 0.92,
      primaryTierConfidence: 0.92,
      primaryTierReasoning: "Strong match",
      escalated: false,
      toptierConfidence: null,
      toptierReasoning: null,
      malformedOutput: false,
    });
    const supabase = makeSupabaseMock();
    await runLayer2ForUnmatchedPayment(supabase as never, payment, [makeInvoice()], tenantId);
    expect(createReviewItem).not.toHaveBeenCalled();
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "match_candidate_proposed",
        payload: expect.objectContaining({ invoice_id: "inv-1", source: "layer2_llm" }),
      }),
    );
  });

  test("escalation to toptier recovers -> publishes match_candidate_proposed with llm tier toptier", async () => {
    vi.mocked(computeLayer2FeatureScore).mockReturnValue([mockBreakdown(0.7)]);
    vi.mocked(reasonAboutMatches).mockResolvedValue({
      verdict: "auto_match_candidate",
      preferredCandidateId: "inv-1",
      finalConfidence: 0.8,
      primaryTierConfidence: 0.55,
      primaryTierReasoning: "weak",
      escalated: true,
      toptierConfidence: 0.8,
      toptierReasoning: "Escalated and resolved",
      malformedOutput: false,
    });
    const supabase = makeSupabaseMock();
    await runLayer2ForUnmatchedPayment(supabase as never, payment, [makeInvoice()], tenantId);
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ llm_tier_used: "toptier" }),
      }),
    );
  });

  test("both tiers below threshold -> creates review item with LLM reasoning attached", async () => {
    vi.mocked(computeLayer2FeatureScore).mockReturnValue([mockBreakdown(0.5)]);
    vi.mocked(reasonAboutMatches).mockResolvedValue({
      verdict: "route_to_review",
      preferredCandidateId: null,
      finalConfidence: 0.55,
      primaryTierConfidence: 0.4,
      primaryTierReasoning: "weak",
      escalated: true,
      toptierConfidence: 0.55,
      toptierReasoning: "Still ambiguous after escalation",
      malformedOutput: false,
    });
    const supabase = makeSupabaseMock();
    await runLayer2ForUnmatchedPayment(supabase as never, payment, [makeInvoice()], tenantId);
    expect(createReviewItem).toHaveBeenCalledWith(
      expect.objectContaining({
        llmReasoningExcerpt: "Still ambiguous after escalation",
        llmConfidence: 0.55,
      }),
    );
  });

  test("generic payer name flags isGenericEnoughToPool for global pattern lookup", async () => {
    vi.mocked(isGenericEnoughToPool).mockReturnValue(true);
    vi.mocked(computeLayer2FeatureScore).mockReturnValue([mockBreakdown(0.85)]);
    vi.mocked(reasonAboutMatches).mockResolvedValue({
      verdict: "auto_match_candidate",
      preferredCandidateId: "inv-1",
      finalConfidence: 0.9,
      primaryTierConfidence: 0.9,
      primaryTierReasoning: "Matched via global pattern boost",
      escalated: false,
      toptierConfidence: null,
      toptierReasoning: null,
      malformedOutput: false,
    });
    const supabase = makeSupabaseMock();
    await runLayer2ForUnmatchedPayment(supabase as never, payment, [makeInvoice()], tenantId);
    expect(isGenericEnoughToPool).toHaveBeenCalled();
    expect(computeLayer2FeatureScore).toHaveBeenCalled();
  });

  test("caps candidates passed to the reasoner at 5 when more are supplied", async () => {
    vi.mocked(computeLayer2FeatureScore).mockImplementation((candidates) =>
      candidates.map((c) => ({ ...mockBreakdown(0.55), invoiceId: c.invoiceId })),
    );
    vi.mocked(reasonAboutMatches).mockResolvedValue({
      verdict: "route_to_review",
      preferredCandidateId: null,
      finalConfidence: 0.5,
      primaryTierConfidence: 0.5,
      primaryTierReasoning: "Too many similar candidates",
      escalated: true,
      toptierConfidence: 0.5,
      toptierReasoning: "Still ambiguous",
      malformedOutput: false,
    });
    const eightInvoices = Array.from({ length: 8 }, (_, i) =>
      makeInvoice({ id: `inv-${i}`, invoiceNumber: `INV-00${i}` }),
    );
    const supabase = makeSupabaseMock();
    await runLayer2ForUnmatchedPayment(supabase as never, payment, eightInvoices, tenantId);
    const call = vi.mocked(reasonAboutMatches).mock.calls[0];
    expect(call[1].length).toBeLessThanOrEqual(5);
  });

  test("MC-4a: all candidates currency-mismatched -> drops to review, never scores or reasons", async () => {
    const supabase = makeSupabaseMock();
    const eurInvoice = makeInvoice({ id: "inv-eur", currency: "EUR" });
    const gbpInvoice = makeInvoice({ id: "inv-gbp", currency: "GBP" });

    await runLayer2ForUnmatchedPayment(
      supabase as never,
      payment, // USD payment
      [eurInvoice, gbpInvoice],
      tenantId,
    );

    expect(computeLayer2FeatureScore).not.toHaveBeenCalled();
    expect(reasonAboutMatches).not.toHaveBeenCalled();
    expect(createReviewItem).toHaveBeenCalledWith(
      expect.objectContaining({ topCandidates: [] }),
    );
    expect(publishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.layer2_dropped_to_review",
      { firmId: "firm-1", companyId: "co-1" },
      "ar_cash_app_payment",
      "pay-1",
      expect.objectContaining({
        reason: "currency_mismatch",
        payment_currency: "USD",
        mismatch_count: 2,
      }),
    );
  });

  test("MC-4a: mixed currency candidates -> only same-currency enter scoring", async () => {
    const supabase = makeSupabaseMock();
    const usdInvoice = makeInvoice({ id: "inv-usd", currency: "USD" });
    const eurInvoice = makeInvoice({ id: "inv-eur", currency: "EUR" });
    vi.mocked(computeLayer2FeatureScore).mockReturnValue([mockBreakdown(0.1)]);

    await runLayer2ForUnmatchedPayment(
      supabase as never,
      payment, // USD payment
      [usdInvoice, eurInvoice],
      tenantId,
    );

    expect(computeLayer2FeatureScore).toHaveBeenCalledTimes(1);
    // Scoring was called with only the USD invoice (1 candidate, not 2)
    const scoringCall = vi.mocked(computeLayer2FeatureScore).mock.calls[0];
    const scoringCandidates = scoringCall[0];
    expect(scoringCandidates).toHaveLength(1);
    expect(scoringCandidates[0].invoiceId).toBe("inv-usd");
  });

  test("MC-4a: all candidates same currency -> unchanged behavior (regression guard)", async () => {
    const supabase = makeSupabaseMock();
    const usdInvoice1 = makeInvoice({ id: "inv-1", currency: "USD" });
    const usdInvoice2 = makeInvoice({ id: "inv-2", currency: "USD" });
    vi.mocked(computeLayer2FeatureScore).mockReturnValue([
      mockBreakdown(0.1),
      mockBreakdown(0.1),
    ]);

    await runLayer2ForUnmatchedPayment(
      supabase as never,
      payment,
      [usdInvoice1, usdInvoice2],
      tenantId,
    );

    expect(computeLayer2FeatureScore).toHaveBeenCalledTimes(1);
    const scoringCall = vi.mocked(computeLayer2FeatureScore).mock.calls[0];
    expect(scoringCall[0]).toHaveLength(2);
    // No currency-mismatch event
    const publishedEvents = vi.mocked(publishCashAppEvent).mock.calls;
    const mismatchEvents = publishedEvents.filter(
      (call) => (call[4] as any)?.reason === "currency_mismatch",
    );
    expect(mismatchEvents).toHaveLength(0);
  });
});
