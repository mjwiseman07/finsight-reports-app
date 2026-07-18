import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  reasonAboutMatches,
  type FirmLlmConfig,
  type PaymentForReasoning,
  type CandidateForReasoning,
} from "./layer2-reasoner";
import type { FeatureBreakdown } from "./layer2-features";

vi.mock("@/lib/llm/anthropic-driver", () => ({
  invokeClaude: vi.fn(),
}));
vi.mock("./publish-cash-app-event", () => ({
  publishCashAppEvent: vi.fn().mockResolvedValue(undefined),
}));

import { invokeClaude } from "@/lib/llm/anthropic-driver";
import { publishCashAppEvent } from "./publish-cash-app-event";

const mockInvokeClaude = vi.mocked(invokeClaude);
const mockPublishCashAppEvent = vi.mocked(publishCashAppEvent);

const firmConfig: FirmLlmConfig = {
  layer2EscalationThreshold: 0.75,
  layer2LlmPrimaryTier: "primary",
  layer2LlmEscalationTier: "toptier",
};

const payment: PaymentForReasoning = {
  id: "pay-1",
  amountReceived: 1000,
  currency: "USD",
  payerNameRaw: "Acme Corp",
  paymentDateIso: "2026-07-05",
  memoRaw: "Payment for services",
};

const candidates: CandidateForReasoning[] = [
  {
    invoiceId: "inv-1",
    docNumber: "INV-100",
    balance: 1000,
    currency: "USD",
    invoiceDateIso: "2026-07-01",
    customerId: "cust-1",
    customerName: "Acme Corp",
  },
  {
    invoiceId: "inv-2",
    docNumber: "INV-200",
    balance: 950,
    currency: "USD",
    invoiceDateIso: "2026-06-15",
    customerId: "cust-2",
    customerName: "Acme Corporation",
  },
];

const featureBreakdowns: FeatureBreakdown[] = [
  {
    invoiceId: "inv-1",
    fuzzyPayerNameScore: 1,
    amountToleranceScore: 1,
    dateProximityScore: 1,
    historicalPayerBehaviorScore: 0.6,
    globalPatternScore: 0,
    globalPatternCapped: false,
    aggregateScore: 0.95,
  },
  {
    invoiceId: "inv-2",
    fuzzyPayerNameScore: 0.8,
    amountToleranceScore: 0.7,
    dateProximityScore: 0.9,
    historicalPayerBehaviorScore: 0,
    globalPatternScore: 0,
    globalPatternCapped: false,
    aggregateScore: 0.6,
  },
];

const tenantId = { firmId: "firm-1", companyId: "co-1" };

function mockResponse(content: object) {
  return {
    text: JSON.stringify(content),
    provider: "bedrock" as const,
    modelId: "us.anthropic.claude-sonnet-4-6",
    inputTokens: 100,
    outputTokens: 50,
    latencyMs: 500,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reasonAboutMatches — happy path (high primary confidence)", () => {
  test("primary tier alone resolves with no escalation", async () => {
    mockInvokeClaude.mockResolvedValueOnce(
      mockResponse({
        verdict: "match",
        confidence: 0.92,
        reasoning: "Strong match on name, amount, date.",
        preferred_candidate_id: "inv-1",
      }),
    );
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      firmConfig,
      "USD",
    );
    expect(result.verdict).toBe("auto_match_candidate");
    expect(result.escalated).toBe(false);
    expect(result.preferredCandidateId).toBe("inv-1");
    expect(mockInvokeClaude).toHaveBeenCalledTimes(1);
    expect(mockInvokeClaude).toHaveBeenCalledWith(expect.objectContaining({ tier: "primary" }));
  });

  test("publishes cash_app.layer2_scored on happy path", async () => {
    mockInvokeClaude.mockResolvedValueOnce(
      mockResponse({
        verdict: "match",
        confidence: 0.92,
        reasoning: "Strong match.",
        preferred_candidate_id: "inv-1",
      }),
    );
    await reasonAboutMatches(payment, candidates, featureBreakdowns, tenantId, firmConfig, "USD");
    expect(mockPublishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.layer2_scored",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  test("does not publish escalation or drop events on happy path", async () => {
    mockInvokeClaude.mockResolvedValueOnce(
      mockResponse({
        verdict: "match",
        confidence: 0.92,
        reasoning: "Strong match.",
        preferred_candidate_id: "inv-1",
      }),
    );
    await reasonAboutMatches(payment, candidates, featureBreakdowns, tenantId, firmConfig, "USD");
    const kinds = mockPublishCashAppEvent.mock.calls.map((c) => c[0]);
    expect(kinds).not.toContain("cash_app.layer2_escalated_to_toptier");
    expect(kinds).not.toContain("cash_app.layer2_dropped_to_review");
  });
});

describe("reasonAboutMatches — escalation path (low primary -> high toptier)", () => {
  test("escalates and recovers with toptier high confidence", async () => {
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.55,
          reasoning: "Ambiguous between two candidates.",
          preferred_candidate_id: "inv-1",
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "match",
          confidence: 0.88,
          reasoning: "On reflection, inv-1 is clearly correct.",
          preferred_candidate_id: "inv-1",
        }),
      );
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      firmConfig,
      "USD",
    );
    expect(result.verdict).toBe("auto_match_candidate");
    expect(result.escalated).toBe(true);
    expect(result.toptierConfidence).toBeCloseTo(0.88, 2);
    expect(mockInvokeClaude).toHaveBeenCalledTimes(2);
    expect(mockInvokeClaude).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tier: "toptier" }),
    );
  });

  test("publishes escalation event with primary confidence and threshold", async () => {
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.55,
          reasoning: "Ambiguous.",
          preferred_candidate_id: null,
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "match",
          confidence: 0.9,
          reasoning: "Resolved.",
          preferred_candidate_id: "inv-1",
        }),
      );
    await reasonAboutMatches(payment, candidates, featureBreakdowns, tenantId, firmConfig, "USD");
    expect(mockPublishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.layer2_escalated_to_toptier",
      expect.objectContaining({ firmId: "firm-1", companyId: "co-1" }),
      "ar_cash_app_payment",
      "pay-1",
      expect.objectContaining({ primary_confidence: 0.5, threshold: 0.75 }),
    );
  });

  test("escalation prompt includes prior belief context", async () => {
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.5,
          reasoning: "Prior reasoning text.",
          preferred_candidate_id: "inv-1",
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "match",
          confidence: 0.9,
          reasoning: "Confirmed.",
          preferred_candidate_id: "inv-1",
        }),
      );
    await reasonAboutMatches(payment, candidates, featureBreakdowns, tenantId, firmConfig, "USD");
    const secondCallArgs = mockInvokeClaude.mock.calls[1][0];
    const userMessage = secondCallArgs.messages[0].content;
    expect(userMessage).toContain("Prior reasoning text.");
  });
});

describe("reasonAboutMatches — drop-to-review path (both tiers low)", () => {
  test("both low confidence drops to review", async () => {
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.4,
          reasoning: "Weak signal.",
          preferred_candidate_id: null,
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.5,
          reasoning: "Still weak after reconsideration.",
          preferred_candidate_id: null,
        }),
      );
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      firmConfig,
      "USD",
    );
    expect(result.verdict).toBe("route_to_review");
    expect(result.escalated).toBe(true);
    expect(mockInvokeClaude).toHaveBeenCalledTimes(2);
  });

  test("publishes layer2_dropped_to_review with both confidences", async () => {
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "no_match",
          confidence: 0.2,
          reasoning: "No plausible candidate.",
          preferred_candidate_id: null,
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "no_match",
          confidence: 0.3,
          reasoning: "Confirmed no match.",
          preferred_candidate_id: null,
        }),
      );
    await reasonAboutMatches(payment, candidates, featureBreakdowns, tenantId, firmConfig, "USD");
    expect(mockPublishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.layer2_dropped_to_review",
      expect.objectContaining({ firmId: "firm-1", companyId: "co-1" }),
      "ar_cash_app_payment",
      "pay-1",
      expect.objectContaining({ primary_confidence: 0.2, toptier_confidence: 0.3 }),
    );
  });

  test("does NOT call a third model after toptier also fails", async () => {
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.3,
          reasoning: "weak",
          preferred_candidate_id: null,
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.3,
          reasoning: "still weak",
          preferred_candidate_id: null,
        }),
      );
    await reasonAboutMatches(payment, candidates, featureBreakdowns, tenantId, firmConfig, "USD");
    expect(mockInvokeClaude).toHaveBeenCalledTimes(2);
    const tiers = mockInvokeClaude.mock.calls.map((c) => c[0].tier);
    expect(tiers).toEqual(["primary", "toptier"]);
  });
});

describe("reasonAboutMatches — malformed JSON path", () => {
  test("malformed primary output drops straight to review without calling toptier", async () => {
    mockInvokeClaude.mockResolvedValueOnce({
      text: "not valid json at all {{{",
      provider: "bedrock",
      modelId: "us.anthropic.claude-sonnet-4-6",
      inputTokens: 100,
      outputTokens: 10,
      latencyMs: 200,
    });
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      firmConfig,
      "USD",
    );
    expect(result.verdict).toBe("route_to_review");
    expect(result.malformedOutput).toBe(true);
    expect(mockInvokeClaude).toHaveBeenCalledTimes(1);
    expect(mockPublishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.layer2_dropped_to_review",
      expect.objectContaining({ firmId: "firm-1", companyId: "co-1" }),
      "ar_cash_app_payment",
      "pay-1",
      expect.objectContaining({ reason: "malformed_primary_llm_output" }),
    );
  });

  test("malformed toptier output after low primary drops to review", async () => {
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "uncertain",
          confidence: 0.4,
          reasoning: "weak",
          preferred_candidate_id: "inv-1",
        }),
      )
      .mockResolvedValueOnce({
        text: '{"verdict": "match", "confidence": 2.5}',
        provider: "bedrock",
        modelId: "us.anthropic.claude-sonnet-5",
        inputTokens: 100,
        outputTokens: 10,
        latencyMs: 300,
      });
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      firmConfig,
      "USD",
    );
    expect(result.verdict).toBe("route_to_review");
    expect(result.malformedOutput).toBe(true);
    expect(result.escalated).toBe(true);
  });

  test("JSON wrapped in markdown fences is still parsed correctly", async () => {
    mockInvokeClaude.mockResolvedValueOnce({
      text: '```json\n{"verdict": "match", "confidence": 0.9, "reasoning": "fenced output", "preferred_candidate_id": "inv-1"}\n```',
      provider: "bedrock",
      modelId: "us.anthropic.claude-sonnet-4-6",
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 400,
    });
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      firmConfig,
      "USD",
    );
    expect(result.verdict).toBe("auto_match_candidate");
    expect(result.malformedOutput).toBe(false);
  });
});

describe("reasonAboutMatches — threshold edge cases", () => {
  test("confidence exactly at threshold does not escalate (< is strict)", async () => {
    mockInvokeClaude.mockResolvedValueOnce(
      mockResponse({
        verdict: "match",
        confidence: 0.75,
        reasoning: "Exactly at threshold.",
        preferred_candidate_id: "inv-1",
      }),
    );
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      firmConfig,
      "USD",
    );
    expect(result.escalated).toBe(false);
    expect(mockInvokeClaude).toHaveBeenCalledTimes(1);
  });

  test("respects a custom per-firm threshold", async () => {
    const strictConfig: FirmLlmConfig = { ...firmConfig, layer2EscalationThreshold: 0.95 };
    mockInvokeClaude
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "match",
          confidence: 0.9,
          reasoning: "High but below strict threshold.",
          preferred_candidate_id: "inv-1",
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          verdict: "match",
          confidence: 0.97,
          reasoning: "Meets strict threshold.",
          preferred_candidate_id: "inv-1",
        }),
      );
    const result = await reasonAboutMatches(
      payment,
      candidates,
      featureBreakdowns,
      tenantId,
      strictConfig,
      "USD",
    );
    expect(result.escalated).toBe(true);
    expect(result.verdict).toBe("auto_match_candidate");
  });
});
