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
      gte: vi.fn(async () => ({ data: [], error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => insertResult ?? { data: { id: "id-1" }, error: null }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => insertResult ?? { data: { id: "id-1" }, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(
              async () =>
                insertResult ?? {
                  data: {
                    id: "amend-1",
                    target_setting: "inbox_autonomy_level",
                    proposed_value: { value: "assist" },
                  },
                  error: null,
                },
            ),
          })),
        })),
      })),
    };
    return api;
  }

  const supabase = {
    from: vi.fn(() => chainableTable()),
  };

  const createServiceClient = vi.fn(() => {
    callOrder.push("db");
    return supabase;
  });

  return {
    callOrder,
    assertEntitlement,
    assertPilotFeature,
    publishEvent,
    supabase,
    createServiceClient,
    chainableTable,
  };
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
  approveDraftedAmendment,
  recordObservation,
  rejectDraftedAmendment,
  runSynthesizer,
} from "@/lib/ap-intake/selfgov/service";

const BASE = {
  firmId: "f1",
  firmClientId: "fc1",
  engagementId: "e1",
  userId: "u1",
};

describe("selfgov service gate ordering", () => {
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

  it("recordObservation propagates gate marker before DB", async () => {
    mocks.assertEntitlement.mockImplementation(() => {
      throw new Error(GATE_MARKER);
    });
    await expect(
      recordObservation({
        ...BASE,
        sourceLayer: "L9",
        observationType: "reviewer_rejected",
        targetSetting: "inbox_autonomy_level",
        observedValue: { value: "observe" },
        actorUserId: BASE.userId,
      }),
    ).rejects.toThrow(GATE_MARKER);
    expect(mocks.callOrder).not.toContain("db");
  });

  it("approveDraftedAmendment propagates gate marker before DB", async () => {
    mocks.assertPilotFeature.mockImplementation(() => {
      throw new Error(GATE_MARKER);
    });
    await expect(
      approveDraftedAmendment({
        ...BASE,
        amendmentId: "amend-1",
        approvedByUserId: BASE.userId,
      }),
    ).rejects.toThrow(GATE_MARKER);
    expect(mocks.callOrder.indexOf("entitlement")).toBeGreaterThanOrEqual(0);
    expect(mocks.callOrder).not.toContain("db");
  });

  it("rejectDraftedAmendment propagates gate marker before DB", async () => {
    mocks.assertEntitlement.mockImplementation(() => {
      throw new Error(GATE_MARKER);
    });
    await expect(
      rejectDraftedAmendment({
        ...BASE,
        amendmentId: "amend-1",
        rejectedByUserId: BASE.userId,
        rejectedReason: "not justified",
      }),
    ).rejects.toThrow(GATE_MARKER);
    expect(mocks.callOrder).not.toContain("db");
  });

  it("runSynthesizer calls gate before DB", async () => {
    mocks.supabase.from.mockImplementation(((table: string) => {
      if (table === "drafted_amendments") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ count: 0, error: null })),
            })),
          })),
        };
      }
      if (table === "observation_events") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        };
      }
      return mocks.chainableTable();
    }) as typeof mocks.supabase.from);
    await runSynthesizer({
      ...BASE,
      reviewerRoleSlug: "firm_admin",
      currentSettings: {},
      lookbackDays: 30,
    });
    expect(mocks.callOrder.indexOf("entitlement")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(mocks.callOrder.indexOf("pilot")).toBeLessThan(mocks.callOrder.indexOf("db"));
  });

  it("rejectDraftedAmendment throws rejected_reason_required after gate passes", async () => {
    await expect(
      rejectDraftedAmendment({
        ...BASE,
        amendmentId: "amend-1",
        rejectedByUserId: BASE.userId,
        rejectedReason: "   ",
      }),
    ).rejects.toThrow("rejected_reason_required");
    expect(mocks.assertEntitlement).toHaveBeenCalled();
    expect(mocks.assertPilotFeature).toHaveBeenCalled();
  });
});
