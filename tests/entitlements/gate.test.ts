import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockSupabase } from "./_mock-supabase";

const mock = makeMockSupabase();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mock,
}));

import { assertEntitlement, EntitlementDenied, hasEntitlement } from "@/lib/entitlements/gate";

const ENGAGEMENT = "eng-11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  for (const k of Object.keys(mock.__state)) mock.__state[k] = [];
});

describe("entitlements/gate", () => {
  it("denies unknown addon code and logs 'unknown_addon'", async () => {
    const r = await hasEntitlement("does_not_exist", ENGAGEMENT, { caller: "test" });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("unknown_addon");
    expect(mock.__state.entitlement_check_audit).toHaveLength(1);
    expect(mock.__state.entitlement_check_audit[0].reason).toBe("unknown_addon");
  });

  it("denies when engagementId is null and logs 'no_engagement'", async () => {
    const r = await hasEntitlement("ap_intake", null, { caller: "test" });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("no_engagement");
  });

  it("denies when no engagement_addons row exists and logs 'no_row'", async () => {
    const r = await hasEntitlement("ap_intake", ENGAGEMENT, { caller: "test" });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("no_row");
  });

  it("denies when row exists but is_active=false", async () => {
    mock.__state.engagement_addons.push({
      id: "x",
      engagement_id: ENGAGEMENT,
      addon_code: "ap_intake",
      is_active: false,
    });
    const r = await hasEntitlement("ap_intake", ENGAGEMENT, { caller: "test" });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("inactive");
  });

  it("allows when row exists and is_active=true", async () => {
    mock.__state.engagement_addons.push({
      id: "x",
      engagement_id: ENGAGEMENT,
      addon_code: "ap_intake",
      is_active: true,
    });
    const r = await hasEntitlement("ap_intake", ENGAGEMENT, { caller: "test" });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("active");
  });

  it("assertEntitlement throws EntitlementDenied on deny", async () => {
    await expect(assertEntitlement("ap_pay", ENGAGEMENT, { caller: "test" })).rejects.toBeInstanceOf(
      EntitlementDenied,
    );
  });

  it("assertEntitlement returns void (no throw) on allow", async () => {
    mock.__state.engagement_addons.push({
      id: "y",
      engagement_id: ENGAGEMENT,
      addon_code: "ap_pay",
      is_active: true,
    });
    await expect(assertEntitlement("ap_pay", ENGAGEMENT, { caller: "test" })).resolves.toBeUndefined();
  });

  it("every gate check writes exactly one audit row", async () => {
    mock.__state.engagement_addons.push({
      id: "z",
      engagement_id: ENGAGEMENT,
      addon_code: "ar_collections",
      is_active: true,
    });
    await hasEntitlement("ar_collections", ENGAGEMENT, { caller: "test.a" });
    await hasEntitlement("ar_collections", ENGAGEMENT, { caller: "test.b" });
    await hasEntitlement("ar_invoicing", ENGAGEMENT, { caller: "test.c" });
    expect(mock.__state.entitlement_check_audit).toHaveLength(3);
    expect(mock.__state.entitlement_check_audit.map((r) => r.caller)).toEqual([
      "test.a",
      "test.b",
      "test.c",
    ]);
  });

  it("audit row records allowed flag correctly", async () => {
    mock.__state.engagement_addons.push({
      id: "w",
      engagement_id: ENGAGEMENT,
      addon_code: "ar_cash_app",
      is_active: true,
    });
    await hasEntitlement("ar_cash_app", ENGAGEMENT, { caller: "cash-app" });
    await hasEntitlement("voice_collections", ENGAGEMENT, { caller: "voice" });
    expect(mock.__state.entitlement_check_audit[0].allowed).toBe(true);
    expect(mock.__state.entitlement_check_audit[1].allowed).toBe(false);
  });

  it("EntitlementDenied preserves addonCode, engagementId, and reason", async () => {
    try {
      await assertEntitlement("ap_intake", ENGAGEMENT, { caller: "test" });
    } catch (e) {
      const err = e as EntitlementDenied;
      expect(err.addonCode).toBe("ap_intake");
      expect(err.engagementId).toBe(ENGAGEMENT);
      expect(err.reason).toBe("no_row");
      return;
    }
    throw new Error("Expected throw");
  });

  it("propagates correlationId into audit rows", async () => {
    await hasEntitlement("ap_intake", ENGAGEMENT, {
      caller: "test",
      correlationId: "corr-123",
    });
    expect(mock.__state.entitlement_check_audit[0].correlation_id).toBe("corr-123");
  });

  it("passes through metadata", async () => {
    await hasEntitlement("ap_intake", ENGAGEMENT, {
      caller: "test",
      metadata: { bill_id: "b_1" },
    });
    expect(
      (mock.__state.entitlement_check_audit[0].metadata as Record<string, unknown>).bill_id,
    ).toBe("b_1");
  });
});
