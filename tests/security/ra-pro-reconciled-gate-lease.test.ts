/**
 * Reconciled #321+#322 regressions:
 * - admitted work continues after gate closure under durable leases
 * - gated events never acquire a lease
 * - stale workers cannot finalize
 * - non–RA Pro billing remains compatible when RA Pro gate is closed
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RA_PRO_CUTOVER_COMMERCE_GATED_CODE } from "@/lib/review-assist-pro/cutover-commerce-gate";
import { randomUUID } from "node:crypto";

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

type Status =
  | "processing"
  | "processed"
  | "skipped"
  | "retryable"
  | "failed_conflict";

type Row = {
  processing_status: Status;
  lease_token: string | null;
  lease_expires_at: number | null;
};

function claimSim(
  store: Map<string, Row>,
  eventId: string,
  now: number,
  ttlMs = 120_000,
) {
  const existing = store.get(eventId);
  if (!existing) {
    const token = randomUUID();
    store.set(eventId, {
      processing_status: "processing",
      lease_token: token,
      lease_expires_at: now + ttlMs,
    });
    return { outcome: "claimed" as const, lease_token: token };
  }
  const canReclaim =
    existing.processing_status === "retryable" ||
    (existing.processing_status === "processing" &&
      existing.lease_expires_at != null &&
      existing.lease_expires_at < now);
  if (canReclaim) {
    const token = randomUUID();
    existing.processing_status = "processing";
    existing.lease_token = token;
    existing.lease_expires_at = now + ttlMs;
    return { outcome: "reclaimed" as const, lease_token: token };
  }
  return { outcome: "lease_held" as const };
}

function finalizeSim(
  store: Map<string, Row>,
  eventId: string,
  leaseToken: string,
  status: Exclude<Status, "processing">,
) {
  const row = store.get(eventId);
  if (
    !row ||
    row.processing_status !== "processing" ||
    row.lease_token !== leaseToken
  ) {
    return { ok: false as const, outcome: "stale_lease" as const };
  }
  row.processing_status = status;
  return { ok: true as const, outcome: "finalized" as const };
}

describe("reconciled RA Pro gate + durable lease regressions", () => {
  beforeEach(() => {
    deleteCalls.count = 0;
    claimSpy.mockReset();
    finalizeSpy.mockReset();
    checkoutMock.mockReset();
    claimSpy.mockResolvedValue({
      outcome: "claimed",
      leaseToken: "lease-reconcile",
      attemptCount: 1,
    });
    finalizeSpy.mockResolvedValue({ ok: true });
  });

  it("gated RA Pro events never acquire a lease (no claim, no DELETE)", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    const r = await handleStripeWebhook(
      checkoutEvt("evt_gated_no_lease", "review_assist_pro"),
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

  it("admitted work continues after closure under the lease flow", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "open";
    const evt = checkoutEvt("evt_admitted_then_close", "review_assist_pro");

    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    checkoutMock.mockImplementation(async () => {
      await blocked;
      return { outcome: "handled" };
    });

    const worker = handleStripeWebhook(evt, {});
    await vi.waitFor(() => {
      expect(claimSpy).toHaveBeenCalledTimes(1);
      expect(checkoutMock).toHaveBeenCalledTimes(1);
    });

    // Close gate mid-flight — admitted claim must still finalize processed.
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    release();
    const result = await worker;
    expect(result).toEqual({ status: "processed" });
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "processed",
        leaseToken: "lease-reconcile",
      }),
    );
    expect(deleteCalls.count).toBe(0);
  });

  it("stale workers cannot finalize after lease transfer", () => {
    const store = new Map<string, Row>();
    const first = claimSim(store, "evt_stale", 1_000, 50);
    const second = claimSim(store, "evt_stale", 1_100, 50);
    expect(second.outcome).toBe("reclaimed");
    expect(
      finalizeSim(store, "evt_stale", first.lease_token!, "processed").outcome,
    ).toBe("stale_lease");
    expect(
      finalizeSim(store, "evt_stale", second.lease_token!, "processed").ok,
    ).toBe(true);
    expect(store.get("evt_stale")!.processing_status).toBe("processed");
  });

  it("non–RA Pro billing remains compatible when RA Pro gate is closed", async () => {
    process.env.RA_PRO_CUTOVER_COMMERCE_GATE = "closed";
    checkoutMock.mockResolvedValue({ outcome: "handled" });

    for (const tier of ["solo_bookkeeper", "review_assist"] as const) {
      claimSpy.mockClear();
      checkoutMock.mockClear();
      finalizeSpy.mockClear();
      claimSpy.mockResolvedValue({
        outcome: "claimed",
        leaseToken: `lease-${tier}`,
        attemptCount: 1,
      });
      finalizeSpy.mockResolvedValue({ ok: true });

      const r = await handleStripeWebhook(checkoutEvt(`evt_${tier}`, tier), {});
      expect(r).toEqual({ status: "processed" });
      expect(claimSpy).toHaveBeenCalledTimes(1);
      expect(checkoutMock).toHaveBeenCalledTimes(1);
      expect(finalizeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "processed" }),
      );
    }
    expect(deleteCalls.count).toBe(0);
  });
});
