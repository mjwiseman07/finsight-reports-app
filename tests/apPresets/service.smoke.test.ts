import { beforeEach, describe, expect, it, vi } from "vitest";

const GATE_MARKER = "GATE_RAN_BEFORE_DB";

const mocks = vi.hoisted(() => {
  const callOrder: string[] = [];
  const assertEntitlement = vi.fn(async () => {
    callOrder.push("entitlement");
  });
  const assertPilotFeature = vi.fn(async () => {
    callOrder.push("pilot");
  });
  const publishEvent = vi.fn(async () => {
    callOrder.push("publish");
  });

  function chainableTable(insertResult?: { data: unknown; error: null }) {
    const api = {
      select: vi.fn(() => api),
      eq: vi.fn(() => api),
      is: vi.fn(() => api),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => insertResult ?? { data: { id: "sel-1" }, error: null }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => insertResult ?? { data: { id: "sel-1" }, error: null }),
        })),
      })),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    };
    return api;
  }

  const supabase = { from: vi.fn(() => chainableTable()) };
  const createServiceClient = vi.fn(() => {
    callOrder.push("db");
    return supabase;
  });

  return { callOrder, assertEntitlement, assertPilotFeature, publishEvent, supabase, createServiceClient, chainableTable };
});

vi.mock("@/lib/entitlements/gate", () => ({
  assertEntitlement: mocks.assertEntitlement,
  EntitlementDenied: class EntitlementDenied extends Error {},
}));
vi.mock("@/lib/entitlements/pilot-features", () => ({
  assertPilotFeature: mocks.assertPilotFeature,
  PilotFeatureDenied: class PilotFeatureDenied extends Error {},
}));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: mocks.publishEvent }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import {
  applyPackOverride,
  selectPresetPack,
  swapPresetPack,
} from "@/lib/ap-intake/presets/service";

const BASE = {
  firmId: "f1",
  firmClientId: "fc1",
  engagementId: "e1",
  userId: "u1",
};

describe("presets service gate ordering", () => {
  beforeEach(() => {
    mocks.callOrder.length = 0;
    vi.clearAllMocks();
    mocks.supabase.from.mockImplementation(() => mocks.chainableTable());
    mocks.assertEntitlement.mockImplementation(async () => {
      mocks.callOrder.push("entitlement");
    });
    mocks.assertPilotFeature.mockImplementation(async () => {
      mocks.callOrder.push("pilot");
    });
  });

  it("selectPresetPack propagates gate marker before DB", async () => {
    mocks.assertEntitlement.mockImplementation(() => {
      throw new Error(GATE_MARKER);
    });
    await expect(
      selectPresetPack({
        ...BASE,
        packCode: "starter",
        selectedByUserId: BASE.userId,
      }),
    ).rejects.toThrow(GATE_MARKER);
    expect(mocks.callOrder).not.toContain("db");
  });

  it("swapPresetPack propagates gate marker before DB", async () => {
    mocks.assertPilotFeature.mockImplementation(() => {
      throw new Error(GATE_MARKER);
    });
    await expect(
      swapPresetPack({
        ...BASE,
        newPackCode: "growing",
        swappedByUserId: BASE.userId,
      }),
    ).rejects.toThrow(GATE_MARKER);
    expect(mocks.callOrder).toContain("entitlement");
    expect(mocks.callOrder).not.toContain("db");
  });

  it("applyPackOverride propagates gate marker before DB", async () => {
    mocks.assertEntitlement.mockImplementation(() => {
      throw new Error(GATE_MARKER);
    });
    await expect(
      applyPackOverride({
        ...BASE,
        override: { aged_prepay_threshold_days: 30 },
        appliedByUserId: BASE.userId,
      }),
    ).rejects.toThrow(GATE_MARKER);
    expect(mocks.callOrder).not.toContain("db");
  });

  it("selectPresetPack succeeds and returns effective settings from pack definition", async () => {
    const result = await selectPresetPack({
      ...BASE,
      packCode: "starter",
      selectedByUserId: BASE.userId,
    });
    expect(mocks.callOrder.indexOf("entitlement")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(mocks.callOrder.indexOf("pilot")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(result.selection_id).toBe("sel-1");
    expect(result.effective_settings.pack_code).toBe("starter");
    expect(result.effective_settings.inbox_autonomy_level).toBe("observe");
    expect(result.effective_settings.fraud_anomaly_zscore_threshold).toBe(2.5);
  });
});
