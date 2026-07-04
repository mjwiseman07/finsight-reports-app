import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "./_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn(async () => ({ id: "evt" })) }));

import { hasEntitlement } from "@/lib/entitlements/gate";
import { activateAddon, deactivateAddon } from "@/lib/entitlements/service";
import { ADDON_CODES } from "@/lib/entitlements/registry";

const ENG_A = "eng-a";
const ENG_B = "eng-b";

beforeEach(() => {
  for (const k of Object.keys(mock.__state)) mock.__state[k] = [];
});

describe("entitlements/independence (no hidden coupling)", () => {
  it("AP Pay standalone: ON, AP Intake OFF — both work as configured", async () => {
    await activateAddon({ engagementId: ENG_A, addonCode: "ap_pay", actorType: "user" });
    const pay = await hasEntitlement("ap_pay", ENG_A, { caller: "test" });
    const intake = await hasEntitlement("ap_intake", ENG_A, { caller: "test" });
    expect(pay.allowed).toBe(true);
    expect(intake.allowed).toBe(false);
  });

  it("AR Cash App standalone (no AR Invoicing) works", async () => {
    await activateAddon({ engagementId: ENG_A, addonCode: "ar_cash_app", actorType: "user" });
    const cashApp = await hasEntitlement("ar_cash_app", ENG_A, { caller: "test" });
    const invoicing = await hasEntitlement("ar_invoicing", ENG_A, { caller: "test" });
    expect(cashApp.allowed).toBe(true);
    expect(invoicing.allowed).toBe(false);
  });

  it("AR Collections standalone — no other AR modules needed", async () => {
    await activateAddon({ engagementId: ENG_A, addonCode: "ar_collections", actorType: "user" });
    const collections = await hasEntitlement("ar_collections", ENG_A, { caller: "test" });
    const invoicing = await hasEntitlement("ar_invoicing", ENG_A, { caller: "test" });
    const cashApp = await hasEntitlement("ar_cash_app", ENG_A, { caller: "test" });
    expect(collections.allowed).toBe(true);
    expect(invoicing.allowed).toBe(false);
    expect(cashApp.allowed).toBe(false);
  });

  it("all 6 add-ons can be independently toggled", async () => {
    for (const code of ADDON_CODES) {
      await activateAddon({ engagementId: ENG_A, addonCode: code, actorType: "user" });
    }
    for (const code of ADDON_CODES) {
      const r = await hasEntitlement(code, ENG_A, { caller: "t" });
      expect(r.allowed).toBe(true);
    }
    await deactivateAddon({ engagementId: ENG_A, addonCode: "ap_pay", actorType: "user" });
    const pay = await hasEntitlement("ap_pay", ENG_A, { caller: "t" });
    expect(pay.allowed).toBe(false);
    const intake = await hasEntitlement("ap_intake", ENG_A, { caller: "t" });
    expect(intake.allowed).toBe(true);
  });

  it("entitlements are engagement-scoped (Engagement A on, Engagement B off)", async () => {
    await activateAddon({ engagementId: ENG_A, addonCode: "ap_intake", actorType: "user" });
    const a = await hasEntitlement("ap_intake", ENG_A, { caller: "t" });
    const b = await hasEntitlement("ap_intake", ENG_B, { caller: "t" });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(false);
  });

  it("deactivation preserves audit history (never hard-deletes)", async () => {
    await activateAddon({ engagementId: ENG_A, addonCode: "ap_intake", actorType: "user" });
    await deactivateAddon({ engagementId: ENG_A, addonCode: "ap_intake", actorType: "user" });
    expect(mock.__state.engagement_addons).toHaveLength(1);
    expect(mock.__state.engagement_addons[0].is_active).toBe(false);
    expect(mock.__state.engagement_addons[0].deactivated_at).toBeTruthy();
  });
});
