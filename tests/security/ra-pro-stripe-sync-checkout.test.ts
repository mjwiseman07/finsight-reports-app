import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "../entitlements/_mock-supabase";

const mock = makeMockSupabase();
const checkoutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/tcp1/stripe-pilot-checkout", () => ({
  handleTcp1CheckoutCompleted: (...args: unknown[]) => checkoutMock(...args),
  handleTcp1SubscriptionDeleted: vi.fn(),
}));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn(async () => ({ id: "evt" })) }));
vi.mock("@/lib/subscription-sync", () => ({
  reconcilePilotSlotStatus: vi.fn(async () => ({ updated: false })),
}));

import { handleStripeWebhook, type MinimalStripeEvent } from "@/lib/entitlements/stripe-sync";

function checkoutEvt(id = "evt_checkout_1"): MinimalStripeEvent {
  return {
    id,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_test",
        metadata: { tier_key: "review_assist_pro", company_id: "co-1" },
      },
    },
  };
}

beforeEach(() => {
  for (const k of Object.keys(mock.__state)) mock.__state[k] = [];
  checkoutMock.mockReset();
});

describe("handleStripeWebhook — RA Pro checkout outcomes", () => {
  it("marks successful activation as processed once", async () => {
    checkoutMock.mockResolvedValue({ outcome: "handled" });
    const r = await handleStripeWebhook(checkoutEvt(), checkoutEvt());
    expect(r).toEqual({ status: "processed" });
    expect(mock.__state.stripe_webhook_events).toHaveLength(1);
    expect(mock.__state.stripe_webhook_events[0].processing_status).toBe("processed");
  });

  it("does not consume idempotency on retryable_failure", async () => {
    checkoutMock.mockResolvedValue({
      outcome: "retryable_failure",
      reason: "missing_buyer_user",
    });
    const r = await handleStripeWebhook(checkoutEvt("evt_retry"), checkoutEvt("evt_retry"));
    expect(r).toEqual({ status: "retryable_error", error: "missing_buyer_user" });
    expect(mock.__state.stripe_webhook_events).toHaveLength(0);

    checkoutMock.mockResolvedValue({ outcome: "handled" });
    const r2 = await handleStripeWebhook(checkoutEvt("evt_retry"), checkoutEvt("evt_retry"));
    expect(r2).toEqual({ status: "processed" });
    expect(mock.__state.stripe_webhook_events).toHaveLength(1);
    expect(mock.__state.stripe_webhook_events[0].processing_status).toBe("processed");
  });

  it("records permanent_conflict as failed, not processed", async () => {
    checkoutMock.mockResolvedValue({
      outcome: "permanent_conflict",
      reason: "pilot_cap_reached",
    });
    const r = await handleStripeWebhook(checkoutEvt("evt_cap"), checkoutEvt("evt_cap"));
    expect(r).toEqual({ status: "conflicted" });
    expect(mock.__state.stripe_webhook_events[0].processing_status).toBe("failed");
    expect(mock.__state.stripe_webhook_events[0].processing_error).toBe(
      "permanent_conflict:pilot_cap_reached",
    );

    const r2 = await handleStripeWebhook(checkoutEvt("evt_cap"), checkoutEvt("evt_cap"));
    expect(r2).toEqual({ status: "duplicate" });
  });

  it("marks verified irrelevant events as skipped without activation success", async () => {
    checkoutMock.mockResolvedValue({
      outcome: "not_applicable",
      reason: "out_of_scope_tier",
    });
    const r = await handleStripeWebhook(checkoutEvt("evt_na"), checkoutEvt("evt_na"));
    expect(r).toEqual({ status: "skipped" });
    expect(mock.__state.stripe_webhook_events[0].processing_status).toBe("skipped");
  });
});
