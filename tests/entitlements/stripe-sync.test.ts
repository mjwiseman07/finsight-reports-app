import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "./_mock-supabase";

const mock = makeMockSupabase();
const publishSpy = vi.hoisted(() => vi.fn(async () => ({ id: "evt" })));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishSpy }));

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
});

describe("entitlements/stripe-sync", () => {
  it("processes a new subscription.updated and activates the mapped addon", async () => {
    const r = await handleStripeWebhook(baseEvt(), baseEvt());
    expect(r.status).toBe("processed");
    expect(mock.__state.engagement_addons).toHaveLength(1);
    expect(mock.__state.engagement_addons[0].addon_code).toBe("ap_intake");
    expect(mock.__state.engagement_addons[0].is_active).toBe(true);
  });

  it("is idempotent — replaying the same event id returns 'duplicate'", async () => {
    await handleStripeWebhook(baseEvt(), baseEvt());
    const r2 = await handleStripeWebhook(baseEvt(), baseEvt());
    expect(r2.status).toBe("duplicate");
    expect(mock.__state.engagement_addons).toHaveLength(1);
  });

  it("skips unhandled event types", async () => {
    const r = await handleStripeWebhook(
      baseEvt({ id: "evt_charge", type: "charge.succeeded" }),
      {},
    );
    expect(r.status).toBe("skipped");
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
    const deleteEvt = baseEvt({
      id: "evt_del",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          status: "canceled",
          metadata: { engagement_id: ENG },
          items: { data: [{ id: "si_ap_intake" }] },
        },
      },
    });
    const r = await handleStripeWebhook(deleteEvt, deleteEvt);
    expect(r.status).toBe("processed");
    expect(mock.__state.engagement_addons[0].is_active).toBe(false);
  });

  it("deactivates on non-active status (past_due)", async () => {
    await handleStripeWebhook(baseEvt(), baseEvt());
    const pastDue = baseEvt({
      id: "evt_past_due",
      data: {
        object: {
          id: "sub_1",
          status: "past_due",
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
    });
    await handleStripeWebhook(pastDue, pastDue);
    expect(mock.__state.engagement_addons[0].is_active).toBe(false);
  });

  it("keeps active on 'trialing' status", async () => {
    const trial = baseEvt({
      id: "evt_trial",
      data: {
        object: {
          id: "sub_1",
          status: "trialing",
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
    });
    await handleStripeWebhook(trial, trial);
    expect(mock.__state.engagement_addons[0].is_active).toBe(true);
  });

  it("publishes an entitlement event on activation", async () => {
    await handleStripeWebhook(baseEvt(), baseEvt());
    expect(publishSpy).toHaveBeenCalled();
    const call = (publishSpy.mock.calls as unknown as Array<[
      { eventType: string; eventCategory: string },
    ]>)[0][0];
    expect(call.eventType).toBe("entitlement.activated");
    expect(call.eventCategory).toBe("entitlement");
  });

  it("records raw payload for audit", async () => {
    await handleStripeWebhook(baseEvt(), { foo: "bar" });
    expect(mock.__state.stripe_webhook_events).toHaveLength(1);
    expect(
      (mock.__state.stripe_webhook_events[0].raw_payload as Record<string, unknown>).foo,
    ).toBe("bar");
  });

  it("marks event as 'processed' in stripe_webhook_events after success", async () => {
    await handleStripeWebhook(baseEvt(), baseEvt());
    expect(mock.__state.stripe_webhook_events[0].processing_status).toBe("processed");
    expect(mock.__state.stripe_webhook_events[0].processed_at).toBeTruthy();
  });
});
