import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "./_mock-supabase";

const mock = makeMockSupabase();
const publishSpy = vi.hoisted(() => vi.fn(async () => ({ id: "evt" })));
const reconcileSpy = vi.hoisted(() =>
  vi.fn(async () => ({
    updated: false,
    targetStatus: null,
    previousStatus: null,
    rowsAffected: 0,
  })),
);
const claimSpy = vi.hoisted(() => vi.fn());
const finalizeSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishSpy }));
vi.mock("@/lib/subscription-sync", () => ({
  reconcilePilotSlotStatus: (...args: unknown[]) => reconcileSpy(...args),
}));
vi.mock("@/lib/entitlements/webhook-lease", () => ({
  claimStripeWebhookEvent: (...args: unknown[]) => claimSpy(...args),
  finalizeStripeWebhookEvent: (...args: unknown[]) => finalizeSpy(...args),
}));

import { handleStripeWebhook, type MinimalStripeEvent } from "@/lib/entitlements/stripe-sync";

const ENG = "eng-1";

function baseEvt(overrides: Partial<MinimalStripeEvent> = {}): MinimalStripeEvent {
  return {
    id: "evt_test",
    type: "customer.subscription.updated",
    livemode: false,
    data: {
      object: {
        id: "sub_1",
        status: "active",
        metadata: { engagement_id: ENG },
        items: {
          data: [
            {
              id: "si_ap_intake",
              price: { id: "price_ap_intake", metadata: { addon_code: "ap_intake" } },
            },
          ],
        },
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  for (const k of Object.keys(mock.__state)) mock.__state[k] = [];
  publishSpy.mockClear();
  reconcileSpy.mockClear();
  claimSpy.mockReset();
  finalizeSpy.mockReset();
  claimSpy.mockResolvedValue({
    outcome: "claimed",
    leaseToken: "lease-1",
    attemptCount: 1,
  });
  finalizeSpy.mockResolvedValue({ ok: true });
});

describe("entitlements/stripe-sync", () => {
  it("processes a new subscription.updated and activates the mapped addon", async () => {
    const r = await handleStripeWebhook(baseEvt(), baseEvt());
    expect(r.status).toBe("processed");
    expect(mock.__state.engagement_addons).toHaveLength(1);
    expect(mock.__state.engagement_addons[0].addon_code).toBe("ap_intake");
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_test",
        leaseToken: "lease-1",
        status: "processed",
      }),
    );
  });

  it("returns duplicate for terminal claim outcome", async () => {
    claimSpy.mockResolvedValueOnce({
      outcome: "duplicate_terminal",
      processingStatus: "processed",
      failureCode: null,
    });
    const r = await handleStripeWebhook(baseEvt(), baseEvt());
    expect(r.status).toBe("duplicate");
    expect(finalizeSpy).not.toHaveBeenCalled();
  });

  it("returns lease_held without finalizing when another worker owns the lease", async () => {
    claimSpy.mockResolvedValueOnce({
      outcome: "lease_held",
      processingStatus: "processing",
    });
    const r = await handleStripeWebhook(baseEvt(), baseEvt());
    expect(r.status).toBe("lease_held");
    expect(finalizeSpy).not.toHaveBeenCalled();
  });

  it("skips unhandled event types", async () => {
    const r = await handleStripeWebhook(
      baseEvt({ id: "evt_charge", type: "charge.succeeded" }),
      {},
    );
    expect(r.status).toBe("skipped");
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped", leaseToken: "lease-1" }),
    );
  });

  it("skips events with no engagement_id metadata", async () => {
    const bare: MinimalStripeEvent = {
      id: "evt_bare",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_2", status: "active", metadata: {} } },
    };
    const r = await handleStripeWebhook(bare, bare);
    expect(r.status).toBe("skipped");
    expect(mock.__state.engagement_addons).toHaveLength(0);
  });

  it("skips line items with no addon_code metadata", async () => {
    const evt = baseEvt({
      data: {
        object: {
          id: "sub_3",
          status: "active",
          metadata: { engagement_id: ENG },
          items: { data: [{ id: "si_random", price: { id: "p_random" } }] },
        },
      },
    });
    await handleStripeWebhook({ ...evt, id: "evt_no_addon" }, evt);
    expect(mock.__state.engagement_addons).toHaveLength(0);
  });

  it("deactivates on subscription.deleted", async () => {
    await handleStripeWebhook(baseEvt(), baseEvt());
    expect(mock.__state.engagement_addons[0].is_active).toBe(true);
    claimSpy.mockResolvedValue({
      outcome: "claimed",
      leaseToken: "lease-del",
      attemptCount: 1,
    });
    const deleteEvt = baseEvt({
      id: "evt_del",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          status: "canceled",
          metadata: { engagement_id: ENG },
          items: {
            data: [{ id: "si_ap_intake", price: { id: "price_ap_intake" } }],
          },
        },
      },
    });
    const r = await handleStripeWebhook(deleteEvt, deleteEvt);
    expect(r.status).toBe("processed");
    expect(mock.__state.engagement_addons[0].is_active).toBe(false);
  });

  it("marks event processed via lease finalize after success", async () => {
    await handleStripeWebhook(baseEvt(), baseEvt());
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processed", leaseToken: "lease-1" }),
    );
  });

  it("finalizes retryable when handler throws and lease is still owned", async () => {
    reconcileSpy.mockRejectedValueOnce(new Error("boom"));
    const bare: MinimalStripeEvent = {
      id: "evt_boom",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_x", status: "active", metadata: {} } },
    };
    await expect(handleStripeWebhook(bare, bare)).rejects.toThrow("boom");
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "retryable",
        failureCode: "handler_exception",
        leaseToken: "lease-1",
      }),
    );
  });
});
