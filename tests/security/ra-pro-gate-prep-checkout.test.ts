/**
 * Gate-only prep: checkout must deny RA Pro before Stripe side effects.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";

const stripeCreate = vi.hoisted(() => vi.fn());
const ensureCustomer = vi.hoisted(() =>
  vi.fn(async () => ({ stripeCustomerId: "cus_test" })),
);
const getUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: (...a: unknown[]) => stripeCreate(...a) } } },
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.limit = self;
    chain.insert = self;
    chain.update = self;
    chain.maybeSingle = async () => ({ data: { id: "user-1" }, error: null });
    chain.single = async () => ({ data: null, error: null });
    return { from: () => chain };
  },
}));
vi.mock("@/lib/stripe-customer", () => ({
  ensureStripeCustomerForUser: ensureCustomer,
}));
vi.mock("@/lib/tcp1/create-session-company", () => ({
  bootstrapCompanyForUser: vi.fn(async () => ({ companyId: "co-1" })),
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

describe("create-session RA Pro cutover gate (prep)", () => {
  beforeEach(() => {
    stripeCreate.mockReset();
    ensureCustomer.mockClear();
    getUser.mockReset();
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

  async function postRaPro() {
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
    return POST(req);
  }

  it("returns 503 before Stripe when gate closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const res = await postRaPro();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe(RA_PRO_CUTOVER_COMMERCE_GATED_CODE);
    expect(ensureCustomer).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("returns 503 before Stripe when gate missing", async () => {
    delete process.env.RA_PRO_CUTOVER_COMMERCE_GATE;
    const res = await postRaPro();
    expect(res.status).toBe(503);
    expect(ensureCustomer).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("returns 503 before Stripe when gate malformed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "maybe";
    const res = await postRaPro();
    expect(res.status).toBe(503);
    expect(ensureCustomer).not.toHaveBeenCalled();
    expect(stripeCreate).not.toHaveBeenCalled();
  });

  it("does not cutover-gate solo_bookkeeper when RA Pro gate closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const req = new NextRequest("http://localhost/api/checkout/create-session", {
      method: "POST",
      body: JSON.stringify({
        tier_key: "solo_bookkeeper",
        pricing_structure: "flat",
        pricing_cadence: "monthly",
        track: "standard",
        business_name: "Solo Co",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).not.toBe(503);
    const body = await res.json();
    expect(body.code).not.toBe(RA_PRO_CUTOVER_COMMERCE_GATED_CODE);
  });
});
