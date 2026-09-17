/**
 * Checkout must deny RA Pro pilot payment before Stripe when cohort occupancy
 * matches activation (numbered slots occupy regardless of pilot_status).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stripeCreate = vi.hoisted(() => vi.fn());
const ensureCustomer = vi.hoisted(() => vi.fn(async () => ({ stripeCustomerId: "cus_test" })));
const getUser = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: (...a: unknown[]) => stripeCreate(...a) } } },
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/stripe-customer", () => ({
  ensureStripeCustomerForUser: ensureCustomer,
}));
vi.mock("@/lib/tcp1/create-session-company", () => ({
  bootstrapCompanyForUser: vi.fn(async () => ({ companyId: "co-1" })),
  CheckoutCompanyBootstrapError: class extends Error {},
}));
vi.mock("@/lib/tcp1/create-session-firm", () => ({
  bootstrapCheckoutFirmWorkspace: vi.fn(async () => ({
    firmId: "firm-1",
    membershipId: "mem-1",
    billingCompanyId: "co-1",
    createdFirm: true,
    createdMembership: true,
  })),
  CheckoutFirmBootstrapError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));
vi.mock("@/lib/product-tiers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/product-tiers")>(
    "@/lib/product-tiers",
  );
  return {
    ...actual,
    getPriceId: () => "price_test",
  };
});
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
  }),
}));

import { POST } from "@/app/api/checkout/create-session/route";

function chainable(final: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.not = self;
  chain.limit = self;
  chain.insert = self;
  chain.update = self;
  Object.assign(chain, final);
  return chain;
}

function cohortQuery(rows: Array<{ pilot_slot_number: number | null }>) {
  const result = Promise.resolve({ data: rows, error: null });
  return chainable({
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      result.then(onFulfilled, onRejected),
  });
}

describe("create-session RA Pro pilot cohort occupancy", () => {
  beforeEach(() => {
    stripeCreate.mockReset();
    ensureCustomer.mockClear();
    getUser.mockReset();
    fromMock.mockReset();
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "a@b.co",
          email_confirmed_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    });
  });

  function mockFullCohort() {
    fromMock.mockImplementation((table: string) => {
      if (table === "users") {
        return chainable({
          maybeSingle: async () => ({ data: { id: "user-1" }, error: null }),
        });
      }
      if (table === "pilot_slots") {
        return cohortQuery(
          Array.from({ length: 10 }, (_, i) => ({ pilot_slot_number: i + 1 })),
        );
      }
      return chainable({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      });
    });
  }

  it("returns 409 before Stripe customer/session when ten cancelled numbered slots occupy capacity", async () => {
    mockFullCohort();

    const req = new NextRequest("http://localhost/api/checkout/create-session", {
      method: "POST",
      body: JSON.stringify({
        tier_key: "review_assist_pro",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
        track: "pilot",
        business_name: "Test Co",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("pilot_cap_reached");
    expect(ensureCustomer).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("contradiction: occupancy denies when ten numbered slots are present regardless of status", async () => {
    mockFullCohort();

    const req = new NextRequest("http://localhost/api/checkout/create-session", {
      method: "POST",
      body: JSON.stringify({
        tier_key: "review_assist_pro",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
        track: "pilot",
        business_name: "Test Co",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(ensureCustomer).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });
});
