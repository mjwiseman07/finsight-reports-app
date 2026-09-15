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
    activateReviewAssistProSubscription: (...args: unknown[]) => activateMock(...args),
    RaProActivationError,
  };
});

import { handleTcp1CheckoutCompleted } from "@/lib/tcp1/stripe-pilot-checkout";

const BUYER_USER_ID = "11111111-1111-1111-1111-111111111111";
const COMPANY_ID = "22222222-2222-2222-2222-222222222222";
const FIRM_ID = "33333333-3333-3333-3333-333333333333";

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
  chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    result.then(onFulfilled, onRejected);
  return chain;
}

describe("handleTcp1CheckoutCompleted — review_assist_pro", () => {
  beforeEach(() => {
    fromMock.mockReset();
    activateMock.mockReset();
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
    activateMock.mockResolvedValue({
      ok: true,
      company_id: COMPANY_ID,
      firm_id: FIRM_ID,
      membership_id: "mem-1",
      pilot_slot_id: "slot-1",
      pilot_slot_number: 1,
      created_firm: true,
      track: "pilot",
    });
  });

  it("rejects firm_id metadata on RA Pro checkout", async () => {
    const result = await handleTcp1CheckoutCompleted({
      id: "cs_ra_pro_firm_meta",
      subscription: "sub_ra_pro",
      customer: "cus_ra_pro",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        firm_id: FIRM_ID,
        track: "pilot",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
        buyer_user_id: BUYER_USER_ID,
      },
    });

    expect(result).toEqual({
      handled: false,
      reason: "unexpected_firm_id_on_ra_pro",
    });
    expect(activateMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("requires company_id for RA Pro checkout", async () => {
    const result = await handleTcp1CheckoutCompleted({
      id: "cs_ra_pro_no_company",
      subscription: "sub_ra_pro",
      customer: "cus_ra_pro",
      metadata: {
        tier_key: "review_assist_pro",
        track: "pilot",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
        buyer_user_id: BUYER_USER_ID,
      },
    });

    expect(result).toEqual({ handled: false, reason: "missing_company_id" });
    expect(activateMock).not.toHaveBeenCalled();
  });

  it("calls activate path with buyer from metadata", async () => {
    const result = await handleTcp1CheckoutCompleted({
      id: "cs_ra_pro_ok",
      subscription: "sub_ra_pro_1",
      customer: "cus_ra_pro_1",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        track: "pilot",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
        buyer_user_id: BUYER_USER_ID,
        business_name: "Acme Bookkeeping",
      },
    });

    expect(result).toEqual({ handled: true });
    expect(activateMock).toHaveBeenCalledTimes(1);
    expect(activateMock).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      buyerUserId: BUYER_USER_ID,
      firmName: "Acme Bookkeeping",
      stripeSubscriptionId: "sub_ra_pro_1",
      stripeCustomerId: "cus_ra_pro_1",
      pricingStructure: "flat",
      pricingCadence: "monthly",
      track: "pilot",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("non-RA-Pro firm tier still uses pilot_slots upsert path", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "pilot_slots") {
        return thenableQuery([]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await handleTcp1CheckoutCompleted({
      id: "cs_review_assist",
      subscription: "sub_ra_base",
      customer: "cus_ra_base",
      metadata: {
        tier_key: "review_assist",
        firm_id: FIRM_ID,
        track: "pilot",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
      },
    });

    expect(result).toEqual({ handled: true });
    expect(activateMock).not.toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tier_key: "review_assist",
        firm_id: FIRM_ID,
        company_id: null,
        pilot_status: "active",
        stripe_subscription_id: "sub_ra_base",
      }),
      { onConflict: "tier_key,firm_id" },
    );
  });
});
