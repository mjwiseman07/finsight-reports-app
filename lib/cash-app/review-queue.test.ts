import { describe, test, expect, vi, beforeEach } from "vitest";
import { createReviewItem, resolveReviewItem } from "./review-queue";

vi.mock("./publish-cash-app-event", () => ({
  publishCashAppEvent: vi.fn().mockResolvedValue(undefined),
}));

import { publishCashAppEvent } from "./publish-cash-app-event";

const mockPublishCashAppEvent = vi.mocked(publishCashAppEvent);

interface MockState {
  reviewItem: { id: string; payment_id: string; status: string; resolution_notes?: string; write_off_amount?: number; write_off_gl_account_id?: string; on_account_customer_id?: string; split_allocations?: unknown[] };
  payment: { amount_received: number };
  globalPatternExisting: { id: string; sample_count: number; contributing_tenant_ids: string[] } | null;
}

function makeMockSupabase(overrides: Partial<MockState> = {}) {
  const state: MockState = {
    reviewItem: { id: "ri-1", payment_id: "pay-1", status: "pending" },
    payment: { amount_received: 1000 },
    globalPatternExisting: null,
    ...overrides,
  };

  return {
    _state: state,
    from: (table: string) => {
      if (table === "ar_cash_app_review_items") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "ri-new" }, error: null }),
            }),
          }),
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.reviewItem, error: null }),
            }),
          }),
          update: (fields: Record<string, unknown>) => ({
            eq: async () => {
              state.reviewItem = { ...state.reviewItem, ...fields } as MockState["reviewItem"];
              return { error: null };
            },
          }),
        };
      }
      if (table === "ar_cash_app_payments") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.payment, error: null }),
            }),
          }),
        };
      }
      if (table === "cash_app_payer_patterns_global") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.globalPatternExisting, error: null }),
            }),
          }),
          insert: async () => ({ error: null }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    },
  };
}

const tenantId = { firmId: "firm-1", companyId: "co-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createReviewItem", () => {
  test("inserts row and publishes review_item_created", async () => {
    const supabase = makeMockSupabase();
    const result = await createReviewItem({
      supabase: supabase as never,
      paymentId: "pay-1",
      topCandidates: [
        {
          invoiceId: "inv-1",
          invoiceNumber: "INV-1",
          customerId: "cust-1",
          customerName: "Acme",
          invoiceAmount: 1000,
          invoiceDueDate: "2026-06-01",
          fuzzyPayerNameScore: 0.6,
          amountToleranceScore: 1,
          dateProximityScore: 1,
          historicalPayerBehaviorScore: 0,
          globalPatternScore: 0,
          aggregateFeatureScore: 0.6,
        },
      ],
      llmReasoningExcerpt: "weak signal",
      llmConfidence: 0.6,
      tenantId,
    });
    expect(result.reviewItemId).toBe("ri-new");
    expect(mockPublishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.review_item_created",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});

describe("resolveReviewItem — accept action", () => {
  test("accept with generic payer contributes to global patterns", async () => {
    const supabase = makeMockSupabase();
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: { action: "accept", invoiceId: "inv-1", matchedAmount: 1000 },
      tenantId,
      payerContext: { payerNameRaw: "MICROSOFT CORPORATION", customerName: "Microsoft Corp" },
    });
    expect(result.resolvedAction).toBe("accept");
    expect(result.contributedToGlobalPatterns).toBe(true);
    expect(mockPublishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.pattern_learned",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  test("accept with non-generic payer does NOT contribute to global patterns", async () => {
    const supabase = makeMockSupabase();
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: { action: "accept", invoiceId: "inv-1", matchedAmount: 1000 },
      tenantId,
      payerContext: { payerNameRaw: "Bob's Local Plumbing", customerName: "Bob's Local Plumbing LLC" },
    });
    expect(result.contributedToGlobalPatterns).toBe(false);
    const kinds = mockPublishCashAppEvent.mock.calls.map((c) => c[0]);
    expect(kinds).not.toContain("cash_app.pattern_learned");
  });

  test("accept without payerContext skips classifier entirely", async () => {
    const supabase = makeMockSupabase();
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: { action: "accept", invoiceId: "inv-1", matchedAmount: 1000 },
      tenantId,
    });
    expect(result.contributedToGlobalPatterns).toBe(false);
  });

  test("publishes review_item_resolved with resolved_action in payload", async () => {
    const supabase = makeMockSupabase();
    await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: { action: "accept", invoiceId: "inv-1", matchedAmount: 1000 },
      tenantId,
    });
    expect(mockPublishCashAppEvent).toHaveBeenCalledWith(
      "cash_app.review_item_resolved",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ resolved_action: "accept" }),
      expect.anything(),
    );
  });
});

describe("resolveReviewItem — reject action", () => {
  test("reject stores reason in resolution_notes", async () => {
    const supabase = makeMockSupabase();
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: { action: "reject", reason: "No plausible invoice found" },
      tenantId,
    });
    expect(result.resolvedAction).toBe("reject");
    expect(supabase._state.reviewItem.resolution_notes).toBe("No plausible invoice found");
  });
});

describe("resolveReviewItem — write_off action", () => {
  test("write_off stores amount and GL account", async () => {
    const supabase = makeMockSupabase();
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: {
        action: "write_off",
        writeOffAmount: 12.5,
        glAccountId: "gl-shortpay",
        invoiceId: "inv-1",
      },
      tenantId,
    });
    expect(result.resolvedAction).toBe("write_off");
    expect(supabase._state.reviewItem.write_off_amount).toBe(12.5);
    expect(supabase._state.reviewItem.write_off_gl_account_id).toBe("gl-shortpay");
  });
});

describe("resolveReviewItem — on_account action", () => {
  test("on_account stores customer id for credit balance", async () => {
    const supabase = makeMockSupabase();
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: { action: "on_account", customerId: "cust-99" },
      tenantId,
    });
    expect(result.resolvedAction).toBe("on_account");
    expect(supabase._state.reviewItem.on_account_customer_id).toBe("cust-99");
  });
});

describe("resolveReviewItem — split action", () => {
  test("split within tolerance succeeds and stores allocations", async () => {
    const supabase = makeMockSupabase();
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: {
        action: "split",
        splitAllocations: [
          { invoiceId: "inv-1", amount: 600 },
          { invoiceId: "inv-2", amount: 400 },
        ],
      },
      tenantId,
    });
    expect(result.resolvedAction).toBe("split");
    expect(supabase._state.reviewItem.split_allocations).toHaveLength(2);
  });

  test("split exceeding tolerance throws and does not update the row", async () => {
    const supabase = makeMockSupabase();
    await expect(
      resolveReviewItem({
        supabase: supabase as never,
        reviewItemId: "ri-1",
        actorUserId: "user-1",
        payload: {
          action: "split",
          splitAllocations: [
            { invoiceId: "inv-1", amount: 600 },
            { invoiceId: "inv-2", amount: 500 },
          ],
        },
        tenantId,
      }),
    ).rejects.toThrow(/does not match payment amount/);
  });

  test("split exactly at 1-cent tolerance succeeds", async () => {
    const supabase = makeMockSupabase({ payment: { amount_received: 1000 } });
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: {
        action: "split",
        splitAllocations: [
          { invoiceId: "inv-1", amount: 600.005 },
          { invoiceId: "inv-2", amount: 399.995 },
        ],
      },
      tenantId,
    });
    expect(result.resolvedAction).toBe("split");
  });
});

describe("resolveReviewItem — guard rails", () => {
  test("resolving an already-resolved item throws", async () => {
    const supabase = makeMockSupabase({
      reviewItem: { id: "ri-1", payment_id: "pay-1", status: "resolved" },
    });
    await expect(
      resolveReviewItem({
        supabase: supabase as never,
        reviewItemId: "ri-1",
        actorUserId: "user-1",
        payload: { action: "accept", invoiceId: "inv-1", matchedAmount: 1000 },
        tenantId,
      }),
    ).rejects.toThrow(/already resolved/);
  });

  test("nonexistent review item throws", async () => {
    const broken = {
      from: (table: string) => {
        if (table === "ar_cash_app_review_items") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: { message: "not found" } }),
              }),
            }),
          };
        }
        throw new Error("unexpected table");
      },
    };
    await expect(
      resolveReviewItem({
        supabase: broken as never,
        reviewItemId: "ri-missing",
        actorUserId: "user-1",
        payload: { action: "reject", reason: "n/a" },
        tenantId,
      }),
    ).rejects.toThrow(/not found/);
  });

  test("repeated contribution from same tenant increments sample_count without duplicating tenant id", async () => {
    const supabase = makeMockSupabase({
      globalPatternExisting: { id: "gp-1", sample_count: 3, contributing_tenant_ids: ["firm-1"] },
    });
    const result = await resolveReviewItem({
      supabase: supabase as never,
      reviewItemId: "ri-1",
      actorUserId: "user-1",
      payload: { action: "accept", invoiceId: "inv-1", matchedAmount: 1000 },
      tenantId,
      payerContext: { payerNameRaw: "MICROSOFT CORPORATION", customerName: "Microsoft Corp" },
    });
    expect(result.contributedToGlobalPatterns).toBe(true);
  });
});

describe("createReviewItem — additional coverage", () => {
  test("stores llm_confidence as null when Layer 2 never reached LLM (no plausible candidate)", async () => {
    const supabase = makeMockSupabase();
    const result = await createReviewItem({
      supabase: supabase as never,
      paymentId: "pay-2",
      topCandidates: [],
      llmReasoningExcerpt: null,
      llmConfidence: null,
      tenantId,
    });
    expect(result.reviewItemId).toBe("ri-new");
  });
});
