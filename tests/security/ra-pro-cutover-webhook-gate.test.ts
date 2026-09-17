/**
 * RA Pro cutover gate — PRE-CLAIM hold in stripe-sync.
 * Closed/missing/malformed must not call claimStripeWebhookEvent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";

const claimSpy = vi.hoisted(() => vi.fn());
const finalizeSpy = vi.hoisted(() => vi.fn());
const checkoutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: vi.fn() }),
}));
vi.mock("@/lib/tcp1/stripe-pilot-checkout", () => ({
  handleTcp1CheckoutCompleted: (...args: unknown[]) => checkoutMock(...args),
  handleTcp1SubscriptionDeleted: vi.fn(),
}));
vi.mock("@/lib/subscription-sync", () => ({
  reconcilePilotSlotStatus: vi.fn(async () => ({ updated: false })),
}));
vi.mock("@/lib/entitlements/webhook-lease", () => ({
  claimStripeWebhookEvent: (...args: unknown[]) => claimSpy(...args),
  finalizeStripeWebhookEvent: (...args: unknown[]) => finalizeSpy(...args),
}));

import { handleStripeWebhook, type MinimalStripeEvent } from "@/lib/entitlements/stripe-sync";

function checkoutEvt(
  id: string,
  tierKey: string,
  extraMeta?: Record<string, string>,
): MinimalStripeEvent {
  return {
    id,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: `cs_${id}`,
        metadata: {
          tier_key: tierKey,
          company_id: "co-1",
          ...extraMeta,
        },
      },
    },
  };
}

describe("RA Pro cutover gate — pre-claim webhook hold", () => {
  beforeEach(() => {
    claimSpy.mockReset();
    finalizeSpy.mockReset();
    checkoutMock.mockReset();
    claimSpy.mockResolvedValue({
      outcome: "claimed",
      leaseToken: "lease-1",
      attemptCount: 1,
    });
    finalizeSpy.mockResolvedValue({ ok: true });
  });

  it("holds RA Pro checkout before lease claim when gate closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_closed", "review_assist_pro"),
      {},
    );
    expect(r).toEqual({
      status: "retryable_error",
      error: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });
    expect(claimSpy).not.toHaveBeenCalled();
    expect(finalizeSpy).not.toHaveBeenCalled();
    expect(checkoutMock).not.toHaveBeenCalled();
  });

  it("missing gate env fails closed before lease claim for RA Pro", async () => {
    delete process.env.RA_PRO_CUTOVER_COMMERCE_GATE;
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_missing", "review_assist_pro"),
      {},
    );
    expect(r).toEqual({
      status: "retryable_error",
      error: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });
    expect(claimSpy).not.toHaveBeenCalled();
    expect(checkoutMock).not.toHaveBeenCalled();
  });

  it("does not gate unrelated solo_bookkeeper checkout", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    checkoutMock.mockResolvedValue({ outcome: "handled" });
    const r = await handleStripeWebhook(
      checkoutEvt("evt_solo", "solo_bookkeeper"),
      {},
    );
    expect(r).toEqual({ status: "processed" });
    expect(claimSpy).toHaveBeenCalledTimes(1);
    expect(checkoutMock).toHaveBeenCalledTimes(1);
  });

  it("admits RA Pro checkout when gate is open (claim then activate)", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    checkoutMock.mockResolvedValue({ outcome: "handled" });
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_open", "review_assist_pro"),
      {},
    );
    expect(r).toEqual({ status: "processed" });
    expect(claimSpy).toHaveBeenCalledTimes(1);
    expect(checkoutMock).toHaveBeenCalledTimes(1);
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processed", leaseToken: "lease-1" }),
    );
  });

  it("Stripe metadata cannot bypass closed admission", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_meta_bypass", "review_assist_pro", {
        already_admitted: "true",
        ra_pro_cutover_admitted: "1",
        gate: "open",
      }),
      {},
    );
    expect(r).toEqual({
      status: "retryable_error",
      error: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });
    expect(claimSpy).not.toHaveBeenCalled();
  });
});
