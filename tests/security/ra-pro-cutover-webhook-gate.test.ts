import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.hoisted(() => vi.fn());
const activateMock = vi.hoisted(() => vi.fn());
const upsertMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/review-assist-pro/activation", () => {
  class RaProActivationError extends Error {
    constructor(
      message: string,
      public readonly code: string,
    ) {
      super(message);
      this.name = "RaProActivationError";
    }
  }
  return {
    activateReviewAssistProSubscription: (...args: unknown[]) =>
      activateMock(...args),
    RaProActivationError,
  };
});

import { handleTcp1CheckoutCompleted } from "@/lib/tcp1/stripe-pilot-checkout";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";

const BUYER_USER_ID = "11111111-1111-1111-1111-111111111111";
const COMPANY_ID = "22222222-2222-2222-2222-222222222222";

function thenableQuery(data: unknown, error: null | object = null) {
  const result = Promise.resolve({ data, error });
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.in = self;
  chain.gt = self;
  chain.order = self;
  chain.upsert = (...args: unknown[]) => upsertMock(...args);
  chain.maybeSingle = () =>
    result.then((r) => ({
      data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data,
      error: r.error,
    }));
  chain.then = (
    onFulfilled: (v: unknown) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => result.then(onFulfilled, onRejected);
  return chain;
}

describe("RA Pro cutover gate — checkout webhook hold", () => {
  beforeEach(() => {
    activateMock.mockReset();
    upsertMock.mockReset();
    fromMock.mockReset();
    fromMock.mockImplementation(() =>
      thenableQuery([{ id: BUYER_USER_ID, stripe_customer_id: "cus_x" }]),
    );
  });

  it("holds RA Pro activation as retryable when gate closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const outcome = await handleTcp1CheckoutCompleted({
      id: "cs_gated",
      subscription: "sub_1",
      customer: "cus_x",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        track: "pilot",
        buyer_user_id: BUYER_USER_ID,
      },
    });
    expect(outcome).toEqual({
      outcome: "retryable_failure",
      reason: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });
    expect(activateMock).not.toHaveBeenCalled();
  });

  it("missing gate env fails closed for RA Pro", async () => {
    delete process.env.RA_PRO_CUTOVER_COMMERCE_GATE;
    const outcome = await handleTcp1CheckoutCompleted({
      id: "cs_missing_gate",
      subscription: "sub_1",
      customer: "cus_x",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        track: "pilot",
        buyer_user_id: BUYER_USER_ID,
      },
    });
    expect(outcome).toEqual({
      outcome: "retryable_failure",
      reason: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });
    expect(activateMock).not.toHaveBeenCalled();
  });

  it("does not gate unrelated solo_bookkeeper checkout", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    upsertMock.mockResolvedValue({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "pilot_slots") {
        return thenableQuery([]);
      }
      return thenableQuery(null);
    });
    const outcome = await handleTcp1CheckoutCompleted({
      id: "cs_solo",
      subscription: "sub_solo",
      customer: "cus_x",
      metadata: {
        tier_key: "solo_bookkeeper",
        firm_id: "33333333-3333-3333-3333-333333333333",
        track: "standard",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
      },
    });
    expect(outcome).toEqual({ outcome: "handled" });
    expect(activateMock).not.toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalled();
  });

  it("reopens RA Pro activation when gate is open", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    activateMock.mockResolvedValue({ firmId: "f1", slotId: "s1" });
    const outcome = await handleTcp1CheckoutCompleted({
      id: "cs_open",
      subscription: "sub_1",
      customer: "cus_x",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        track: "pilot",
        buyer_user_id: BUYER_USER_ID,
      },
    });
    expect(outcome).toEqual({ outcome: "handled" });
    expect(activateMock).toHaveBeenCalledTimes(1);
  });
});
