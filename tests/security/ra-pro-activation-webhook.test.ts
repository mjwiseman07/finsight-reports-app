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
import { RaProActivationError } from "@/lib/review-assist-pro/activation";

const BUYER_USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "99999999-9999-9999-9999-999999999999";
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

  it("rejects firm_id metadata on RA Pro checkout as permanent conflict", async () => {
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
      outcome: "permanent_conflict",
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

    expect(result).toEqual({
      outcome: "permanent_conflict",
      reason: "missing_company_id",
    });
    expect(activateMock).not.toHaveBeenCalled();
  });

  it("calls activate path when Stripe customer maps to buyer", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return thenableQuery([{ id: BUYER_USER_ID }]);
      }
      throw new Error(`unexpected table ${table}`);
    });

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

    expect(result).toEqual({ outcome: "handled" });
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

  it("permanent-conflicts when metadata buyer disagrees with Stripe customer user", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return thenableQuery([{ id: OTHER_USER_ID }]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await handleTcp1CheckoutCompleted({
      id: "cs_ra_pro_mismatch",
      subscription: "sub_ra_pro_m",
      customer: "cus_ra_pro_m",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        track: "pilot",
        buyer_user_id: BUYER_USER_ID,
      },
    });

    expect(result).toEqual({
      outcome: "permanent_conflict",
      reason: "buyer_customer_mismatch",
    });
    expect(activateMock).not.toHaveBeenCalled();
  });

  it("maps pilot_cap_reached to permanent_conflict", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return thenableQuery([{ id: BUYER_USER_ID }]);
      }
      throw new Error(`unexpected table ${table}`);
    });
    activateMock.mockRejectedValue(new RaProActivationError("pilot_cap_reached", "pilot_cap_reached"));

    const result = await handleTcp1CheckoutCompleted({
      id: "cs_ra_pro_cap",
      subscription: "sub_cap",
      customer: "cus_cap",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        track: "pilot",
        buyer_user_id: BUYER_USER_ID,
      },
    });

    expect(result).toEqual({
      outcome: "permanent_conflict",
      reason: "pilot_cap_reached",
    });
  });

  it("maps buyer_not_company_member to permanent_conflict", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return thenableQuery([{ id: BUYER_USER_ID }]);
      }
      throw new Error(`unexpected table ${table}`);
    });
    activateMock.mockRejectedValue(
      new RaProActivationError("buyer_not_company_member", "buyer_not_company_member"),
    );

    const result = await handleTcp1CheckoutCompleted({
      id: "cs_ra_pro_owner",
      subscription: "sub_owner",
      customer: "cus_owner",
      metadata: {
        tier_key: "review_assist_pro",
        company_id: COMPANY_ID,
        track: "pilot",
        buyer_user_id: BUYER_USER_ID,
      },
    });

    expect(result).toEqual({
      outcome: "permanent_conflict",
      reason: "buyer_not_company_member",
    });
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

    expect(result).toEqual({ outcome: "handled" });
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

  it("marks out-of-scope tiers as not_applicable", async () => {
    const result = await handleTcp1CheckoutCompleted({
      id: "cs_future",
      subscription: "sub_x",
      customer: "cus_x",
      metadata: { tier_key: "enterprise_firm", track: "pilot" },
    });
    expect(result).toEqual({
      outcome: "not_applicable",
      reason: "out_of_scope_tier",
    });
  });
});
