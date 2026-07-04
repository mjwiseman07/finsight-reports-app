import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "./_mock-supabase";

const mock = makeMockSupabase();
const publishSpy = vi.hoisted(() => vi.fn(async () => ({ id: "evt" })));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishSpy }));

import { activateAddon, deactivateAddon } from "@/lib/entitlements/service";

beforeEach(() => {
  for (const k of Object.keys(mock.__state)) mock.__state[k] = [];
  publishSpy.mockClear();
});

describe("entitlements/service", () => {
  it("activateAddon creates a row with is_active=true", async () => {
    const r = await activateAddon({
      engagementId: "e1",
      addonCode: "ap_intake",
      actorType: "user",
      actorId: "mwiseman",
    });
    expect(r.id).toBeTruthy();
    expect(mock.__state.engagement_addons[0].is_active).toBe(true);
    expect(mock.__state.engagement_addons[0].activated_at).toBeTruthy();
    expect(mock.__state.engagement_addons[0].deactivated_at).toBeNull();
  });

  it("activateAddon is idempotent via upsert", async () => {
    await activateAddon({ engagementId: "e1", addonCode: "ap_intake", actorType: "user" });
    await activateAddon({ engagementId: "e1", addonCode: "ap_intake", actorType: "user" });
    expect(mock.__state.engagement_addons).toHaveLength(1);
  });

  it("re-activating a deactivated addon clears deactivated_at", async () => {
    await activateAddon({ engagementId: "e1", addonCode: "ap_intake", actorType: "user" });
    await deactivateAddon({ engagementId: "e1", addonCode: "ap_intake", actorType: "user" });
    expect(mock.__state.engagement_addons[0].deactivated_at).toBeTruthy();
    await activateAddon({ engagementId: "e1", addonCode: "ap_intake", actorType: "user" });
    expect(mock.__state.engagement_addons[0].deactivated_at).toBeNull();
    expect(mock.__state.engagement_addons[0].is_active).toBe(true);
  });

  it("deactivateAddon on nonexistent row is a no-op (returns id:null)", async () => {
    const r = await deactivateAddon({
      engagementId: "e_nowhere",
      addonCode: "ap_pay",
      actorType: "user",
    });
    expect(r.id).toBeNull();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("activate publishes entitlement.activated event", async () => {
    await activateAddon({ engagementId: "e1", addonCode: "ap_pay", actorType: "user" });
    expect(publishSpy).toHaveBeenCalledTimes(1);
    const c = (publishSpy.mock.calls as unknown as Array<[{ eventType: string; payload: Record<string, unknown> }]>)
      [0][0];
    expect(c.eventType).toBe("entitlement.activated");
    expect(c.payload.addon_code).toBe("ap_pay");
  });

  it("deactivate publishes entitlement.deactivated event with reason", async () => {
    await activateAddon({ engagementId: "e1", addonCode: "ap_pay", actorType: "user" });
    await deactivateAddon({
      engagementId: "e1",
      addonCode: "ap_pay",
      actorType: "user",
      reason: "test-off",
    });
    const calls = publishSpy.mock.calls as unknown as Array<[
      { eventType: string; payload: Record<string, unknown> },
    ]>;
    const last = calls.at(-1)![0];
    expect(last.eventType).toBe("entitlement.deactivated");
    expect(last.payload.reason).toBe("test-off");
  });

  it("rejects unknown addon code", async () => {
    await expect(
      activateAddon({
        engagementId: "e1",
        addonCode: "not_real" as never,
        actorType: "user",
      }),
    ).rejects.toThrow(/Unknown addon code/);
  });
});
