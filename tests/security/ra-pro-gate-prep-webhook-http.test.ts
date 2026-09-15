/**
 * HTTP mapping for gate-only prep retryable holds.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";

const handleMock = vi.hoisted(() => vi.fn());
const constructEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/entitlements/stripe-sync", () => ({
  handleStripeWebhook: (...a: unknown[]) => handleMock(...a),
}));
vi.mock("@/lib/stripe/livemode-guard", () => ({
  checkLivemode: () => ({ ok: true }),
}));
vi.mock("stripe", () => ({
  default: class Stripe {
    webhooks = { constructEvent: (...a: unknown[]) => constructEvent(...a) };
  },
}));

describe("POST /api/webhooks/stripe — cutover gate HTTP (prep)", () => {
  beforeEach(() => {
    handleMock.mockReset();
    constructEvent.mockReset();
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET_TCP1 = "test_webhook_secret";
  });

  it("returns HTTP 500 for retryable_error so Stripe redelivers", async () => {
    constructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      livemode: false,
      data: { object: {} },
    });
    handleMock.mockResolvedValue({
      status: "retryable_error",
      error: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "t=1,v1=x" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.status).toBe("retryable_error");
    expect(body.received).toBe(false);
  });

  it("returns HTTP 200 for duplicate without implying ledger removal", async () => {
    constructEvent.mockReturnValue({
      id: "evt_dup",
      type: "checkout.session.completed",
      livemode: false,
      data: { object: {} },
    });
    handleMock.mockResolvedValue({ status: "duplicate" });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "t=1,v1=x" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, status: "duplicate" });
  });
});
