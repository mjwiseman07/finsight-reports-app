/**
 * Gate-only prep: admission check before lease claim; never erase admitted rows.
 * Adapted for durable lease ownership (#321) while preserving #322 admission semantics.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";

const claimSpy = vi.hoisted(() => vi.fn());
const finalizeSpy = vi.hoisted(() => vi.fn());
const checkoutMock = vi.hoisted(() => vi.fn());
const deleteCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === "stripe_webhook_events") {
        return {
          delete: () => ({
            eq: async () => {
              deleteCalls.count += 1;
              return { error: null };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
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

describe("handleStripeWebhook — RA Pro cutover admission gate (prep)", () => {
  beforeEach(() => {
    deleteCalls.count = 0;
    checkoutMock.mockReset();
    claimSpy.mockReset();
    finalizeSpy.mockReset();
    claimSpy.mockResolvedValue({
      outcome: "claimed",
      leaseToken: "lease-prep",
      attemptCount: 1,
    });
    finalizeSpy.mockResolvedValue({ ok: true });
  });

  it("holds RA Pro checkout before lease claim when gate closed (no claim, no activation)", async () => {
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
    expect(deleteCalls.count).toBe(0);
  });

  it("closed pre-claim hold then open redelivery processes normally", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const evt = checkoutEvt("evt_ra_retry", "review_assist_pro");
    const first = await handleStripeWebhook(evt, {});
    expect(first.status).toBe("retryable_error");
    expect(claimSpy).not.toHaveBeenCalled();

    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    checkoutMock.mockResolvedValue({ outcome: "handled" });
    const second = await handleStripeWebhook(evt, {});
    expect(second).toEqual({ status: "processed" });
    expect(claimSpy).toHaveBeenCalledTimes(1);
    expect(checkoutMock).toHaveBeenCalledTimes(1);
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processed", leaseToken: "lease-prep" }),
    );
    expect(deleteCalls.count).toBe(0);
  });

  it("admitted worker A keeps lease when B races and gate closes mid-flight", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    const evt = checkoutEvt("evt_ra_concurrent", "review_assist_pro");

    let releaseA!: () => void;
    const aBlocked = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    checkoutMock.mockImplementation(async () => {
      await aBlocked;
      return { outcome: "handled" };
    });

    const workerA = handleStripeWebhook(evt, {});
    await vi.waitFor(() => {
      expect(claimSpy).toHaveBeenCalledTimes(1);
      expect(checkoutMock).toHaveBeenCalledTimes(1);
    });

    claimSpy.mockResolvedValueOnce({
      outcome: "lease_held",
      processingStatus: "processing",
    });
    const workerB = await handleStripeWebhook(evt, {});
    expect(workerB).toEqual({ status: "lease_held" });

    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    releaseA();
    const aResult = await workerA;

    expect(aResult).toEqual({ status: "processed" });
    expect(checkoutMock).toHaveBeenCalledTimes(1);
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processed" }),
    );
    expect(deleteCalls.count).toBe(0);
  });

  it("never removes ledger rows via gate path on gated delivery", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_new_gated", "review_assist_pro"),
      {},
    );
    expect(r.status).toBe("retryable_error");
    expect(claimSpy).not.toHaveBeenCalled();
    expect(deleteCalls.count).toBe(0);

    // Duplicate/terminal against an already-admitted event must ACK without deletion.
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    claimSpy.mockResolvedValueOnce({
      outcome: "duplicate_terminal",
      processingStatus: "processed",
      failureCode: null,
    });
    const dup = await handleStripeWebhook(
      checkoutEvt("evt_existing_processed", "review_assist_pro"),
      {},
    );
    expect(dup).toEqual({ status: "duplicate" });
    expect(deleteCalls.count).toBe(0);
  });

  it("Stripe metadata cannot bypass closed admission (no external admitted flag)", async () => {
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
    expect(checkoutMock).not.toHaveBeenCalled();
  });

  it("does not gate solo_bookkeeper checkout when RA Pro gate closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    checkoutMock.mockResolvedValue({ outcome: "handled" });
    const r = await handleStripeWebhook(
      checkoutEvt("evt_solo", "solo_bookkeeper"),
      {},
    );
    expect(r).toEqual({ status: "processed" });
    expect(claimSpy).toHaveBeenCalled();
    expect(checkoutMock).toHaveBeenCalled();
  });

  it("marks gated holds neither processed nor skipped and never deletes", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_terminal_guard", "review_assist_pro"),
      {},
    );
    expect(r.status).toBe("retryable_error");
    expect(claimSpy).not.toHaveBeenCalled();
    expect(finalizeSpy).not.toHaveBeenCalled();
    expect(deleteCalls.count).toBe(0);
  });
});
