/**
 * Gate-only prep: ledger must allow Stripe redelivery after gated RA Pro hold.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";

type Row = {
  stripe_event_id: string;
  event_type: string;
  processing_status: string;
  processing_error?: string | null;
};

const store = vi.hoisted(() => ({ rows: [] as Row[] }));
const checkoutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table !== "stripe_webhook_events") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        insert: async (row: Row) => {
          if (store.rows.some((r) => r.stripe_event_id === row.stripe_event_id)) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          store.rows.push({ ...row });
          return { error: null };
        },
        update: (patch: Partial<Row>) => ({
          eq: async (_col: string, id: string) => {
            const row = store.rows.find((r) => r.stripe_event_id === id);
            if (row) Object.assign(row, patch);
            return { error: null };
          },
        }),
        delete: () => ({
          eq: async (_col: string, id: string) => {
            store.rows = store.rows.filter((r) => r.stripe_event_id !== id);
            return { error: null };
          },
        }),
      };
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

import { handleStripeWebhook, type MinimalStripeEvent } from "@/lib/entitlements/stripe-sync";
import { RaProCutoverCommerceGatedError } from "@/lib/review-assist-pro/cutover-commerce-gate";

function checkoutEvt(
  id: string,
  tierKey: string,
): MinimalStripeEvent {
  return {
    id,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: `cs_${id}`,
        metadata: { tier_key: tierKey, company_id: "co-1" },
      },
    },
  };
}

describe("handleStripeWebhook — RA Pro cutover gate redelivery (prep)", () => {
  beforeEach(() => {
    store.rows = [];
    checkoutMock.mockReset();
  });

  it("holds RA Pro checkout before ledger insert when gate closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_closed", "review_assist_pro"),
      {},
    );
    expect(r).toEqual({
      status: "retryable_error",
      error: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });
    expect(store.rows).toHaveLength(0);
    expect(checkoutMock).not.toHaveBeenCalled();
  });

  it("allows redelivery after gated hold (no permanent duplicate)", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const evt = checkoutEvt("evt_ra_retry", "review_assist_pro");
    const first = await handleStripeWebhook(evt, {});
    expect(first.status).toBe("retryable_error");
    expect(store.rows).toHaveLength(0);

    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    checkoutMock.mockResolvedValue({ handled: true });
    const second = await handleStripeWebhook(evt, {});
    expect(second).toEqual({ status: "processed" });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].processing_status).toBe("processed");
    expect(checkoutMock).toHaveBeenCalledTimes(1);
  });

  it("deletes ledger row if gated after insert (defense in depth)", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    // Force post-insert gate throw by flipping env inside handler mock.
    checkoutMock.mockImplementation(async () => {
      process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
      throw new RaProCutoverCommerceGatedError();
    });
    // Pre-insert sees open, so insert proceeds; handler then throws gated.
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_defense", "review_assist_pro"),
      {},
    );
    expect(r).toEqual({
      status: "retryable_error",
      error: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    });
    expect(store.rows).toHaveLength(0);
  });

  it("does not gate solo_bookkeeper checkout when RA Pro gate closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    checkoutMock.mockResolvedValue({ handled: true });
    const r = await handleStripeWebhook(
      checkoutEvt("evt_solo", "solo_bookkeeper"),
      {},
    );
    expect(r).toEqual({ status: "processed" });
    expect(checkoutMock).toHaveBeenCalled();
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].processing_status).toBe("processed");
  });

  it("marks gated holds neither processed nor skipped", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_terminal_guard", "review_assist_pro"),
      {},
    );
    expect(r.status).toBe("retryable_error");
    expect(store.rows.every((row) => row.processing_status !== "processed")).toBe(
      true,
    );
    expect(store.rows.every((row) => row.processing_status !== "skipped")).toBe(true);
  });
});
