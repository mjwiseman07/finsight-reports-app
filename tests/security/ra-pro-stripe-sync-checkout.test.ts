import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "../entitlements/_mock-supabase";

const mock = makeMockSupabase();
const checkoutMock = vi.hoisted(() => vi.fn());
const claimSpy = vi.hoisted(() => vi.fn());
const finalizeSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/tcp1/stripe-pilot-checkout", () => ({
  handleTcp1CheckoutCompleted: (...args: unknown[]) => checkoutMock(...args),
  handleTcp1SubscriptionDeleted: vi.fn(),
}));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn(async () => ({ id: "evt" })) }));
vi.mock("@/lib/subscription-sync", () => ({
  reconcilePilotSlotStatus: vi.fn(async () => ({ updated: false })),
}));
vi.mock("@/lib/entitlements/webhook-lease", () => ({
  claimStripeWebhookEvent: (...args: unknown[]) => claimSpy(...args),
  finalizeStripeWebhookEvent: (...args: unknown[]) => finalizeSpy(...args),
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
  claimSpy.mockReset();
  finalizeSpy.mockReset();
  claimSpy.mockResolvedValue({
    outcome: "claimed",
    leaseToken: "lease-co",
    attemptCount: 1,
  });
  finalizeSpy.mockResolvedValue({ ok: true });
});

describe("handleStripeWebhook — RA Pro checkout outcomes with leases", () => {
  it("marks successful activation as processed once", async () => {
    checkoutMock.mockResolvedValue({ outcome: "handled" });
    const r = await handleStripeWebhook(checkoutEvt(), checkoutEvt());
    expect(r).toEqual({ status: "processed" });
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processed", leaseToken: "lease-co" }),
    );
  });

  it("marks retryable_failure as retryable without deleting the ledger row", async () => {
    checkoutMock.mockResolvedValue({
      outcome: "retryable_failure",
      reason: "missing_buyer_user",
    });
    const r = await handleStripeWebhook(checkoutEvt("evt_retry"), checkoutEvt("evt_retry"));
    expect(r).toEqual({ status: "retryable_error", error: "missing_buyer_user" });
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "retryable",
        failureCode: "missing_buyer_user",
        leaseToken: "lease-co",
      }),
    );
  });

  it("records permanent_conflict as failed_conflict", async () => {
    checkoutMock.mockResolvedValue({
      outcome: "permanent_conflict",
      reason: "pilot_cap_reached",
    });
    const r = await handleStripeWebhook(checkoutEvt("evt_cap"), checkoutEvt("evt_cap"));
    expect(r).toEqual({ status: "conflicted" });
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed_conflict",
        failureCode: "pilot_cap_reached",
      }),
    );
  });

  it("marks verified irrelevant events as skipped", async () => {
    checkoutMock.mockResolvedValue({
      outcome: "not_applicable",
      reason: "out_of_scope_tier",
    });
    const r = await handleStripeWebhook(checkoutEvt("evt_na"), checkoutEvt("evt_na"));
    expect(r).toEqual({ status: "skipped" });
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped" }),
    );
  });

  it("stale finalize after lease transfer returns lease_held", async () => {
    checkoutMock.mockResolvedValue({ outcome: "handled" });
    finalizeSpy.mockResolvedValueOnce({ ok: false, outcome: "stale_lease" });
    const r = await handleStripeWebhook(checkoutEvt("evt_stale"), checkoutEvt("evt_stale"));
    expect(r).toEqual({ status: "lease_held" });
  });
});
