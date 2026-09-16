/**
 * Gate-only prep: admission check before ledger insert; never erase admitted rows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";

type Row = {
  stripe_event_id: string;
  event_type: string;
  processing_status: string;
  processing_error?: string | null;
};

const store = vi.hoisted(() => ({
  rows: [] as Row[],
  deleteCalls: 0,
}));
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
            store.deleteCalls += 1;
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
    store.rows = [];
    store.deleteCalls = 0;
    checkoutMock.mockReset();
  });

  it("holds RA Pro checkout before ledger insert when gate closed (no write, no activation)", async () => {
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
    expect(store.deleteCalls).toBe(0);
  });

  it("closed pre-insert hold then open redelivery processes normally", async () => {
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
    expect(store.deleteCalls).toBe(0);
  });

  it("admitted worker A keeps row when B duplicates and gate closes mid-flight", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    const evt = checkoutEvt("evt_ra_concurrent", "review_assist_pro");

    let releaseA!: () => void;
    const aBlocked = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    checkoutMock.mockImplementation(async () => {
      await aBlocked;
      return { handled: true };
    });

    const workerA = handleStripeWebhook(evt, {});
    // Allow A to insert and enter activation before B races.
    await vi.waitFor(() => {
      expect(store.rows).toHaveLength(1);
      expect(store.rows[0].processing_status).toBe("processing");
    });

    const workerB = await handleStripeWebhook(evt, {});
    expect(workerB).toEqual({ status: "duplicate" });

    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    releaseA();
    const aResult = await workerA;

    expect(aResult).toEqual({ status: "processed" });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].stripe_event_id).toBe("evt_ra_concurrent");
    expect(store.rows[0].processing_status).toBe("processed");
    expect(checkoutMock).toHaveBeenCalledTimes(1);
    expect(store.deleteCalls).toBe(0);
  });

  it("never removes existing processing/processed/skipped rows on gated delivery", async () => {
    store.rows.push(
      {
        stripe_event_id: "evt_existing_processing",
        event_type: "checkout.session.completed",
        processing_status: "processing",
      },
      {
        stripe_event_id: "evt_existing_processed",
        event_type: "checkout.session.completed",
        processing_status: "processed",
      },
      {
        stripe_event_id: "evt_existing_skipped",
        event_type: "customer.subscription.updated",
        processing_status: "skipped",
      },
    );
    const snapshot = structuredClone(store.rows);

    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_new_gated", "review_assist_pro"),
      {},
    );
    expect(r.status).toBe("retryable_error");
    expect(store.rows).toEqual(snapshot);
    expect(store.deleteCalls).toBe(0);

    // Duplicate against an existing admitted row must ACK without deletion.
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    const dup = await handleStripeWebhook(
      checkoutEvt("evt_existing_processed", "review_assist_pro"),
      {},
    );
    expect(dup).toEqual({ status: "duplicate" });
    expect(store.rows).toEqual(snapshot);
    expect(store.deleteCalls).toBe(0);
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
    expect(store.rows).toHaveLength(0);
    expect(checkoutMock).not.toHaveBeenCalled();
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

  it("marks gated holds neither processed nor skipped and never deletes", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_ra_terminal_guard", "review_assist_pro"),
      {},
    );
    expect(r.status).toBe("retryable_error");
    expect(store.rows).toHaveLength(0);
    expect(store.deleteCalls).toBe(0);
  });
});
