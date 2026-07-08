import { beforeEach, describe, expect, it, vi } from "vitest";

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
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(
        async () => insertResult ?? { data: { id: "id-1", status: "draft" }, error: null },
      ),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => insertResult ?? { data: { id: "id-1" }, error: null }),
        })),
      })),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
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
  addBatchLine,
  attemptRailFanout,
  computePaymentInterlock,
  createPaymentBatch,
} from "@/lib/ap-intake/payments/service";

const BASE = {
  firmId: "f1",
  firmClientId: "fc1",
  engagementId: "e1",
  actorUserId: "u1",
};

describe("payments service gate ordering", () => {
  beforeEach(() => {
    mocks.callOrder.length = 0;
    vi.clearAllMocks();
    mocks.supabase.from.mockImplementation(() => mocks.chainableTable());
  });

  it("createPaymentBatch calls gate before DB", async () => {
    await createPaymentBatch({
      ...BASE,
      batchNumber: "B-001",
      requestedByUserId: BASE.actorUserId,
    });
    expect(mocks.callOrder.indexOf("entitlement")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(mocks.callOrder.indexOf("pilot")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(mocks.assertEntitlement).toHaveBeenCalled();
    expect(mocks.assertPilotFeature).toHaveBeenCalled();
  });

  it("addBatchLine calls gate before DB", async () => {
    await addBatchLine({
      ...BASE,
      batchId: "batch-1",
      vendorId: "v1",
      grossAmountCents: 1000,
    });
    expect(mocks.callOrder.indexOf("entitlement")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(mocks.callOrder.indexOf("pilot")).toBeLessThan(mocks.callOrder.indexOf("db"));
  });

  it("computePaymentInterlock calls gate before DB", async () => {
    const linesApi = {
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: [], error: null })),
      })),
    };
    const interlockApi = mocks.chainableTable({ data: { id: "evt-1" }, error: null });
    mocks.supabase.from.mockImplementation(((table: string) => {
      if (table === "payment_batch_lines") return linesApi;
      if (table === "payment_batch_interlock_events") return interlockApi;
      return mocks.chainableTable();
    }) as typeof mocks.supabase.from);
    await computePaymentInterlock({
      ...BASE,
      batchId: "batch-1",
    });
    expect(mocks.callOrder.indexOf("entitlement")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(mocks.callOrder.indexOf("pilot")).toBeLessThan(mocks.callOrder.indexOf("db"));
  });

  it("attemptRailFanout calls gate before DB", async () => {
    mocks.supabase.from.mockImplementation(((table: string) => {
      if (table === "vendor_bank_accounts") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { preferred_rail: "ach", is_active: true },
                error: null,
              })),
            })),
          })),
        };
      }
      return mocks.chainableTable({ data: { id: "fanout-1" }, error: null });
    }) as typeof mocks.supabase.from);
    await attemptRailFanout({
      ...BASE,
      batchId: "batch-1",
      batchLineId: "line-1",
      vendorId: "v1",
      vendorBankAccountId: "vba-1",
      amountCents: 5000,
    });
    expect(mocks.callOrder.indexOf("entitlement")).toBeLessThan(mocks.callOrder.indexOf("db"));
    expect(mocks.callOrder.indexOf("pilot")).toBeLessThan(mocks.callOrder.indexOf("db"));
  });
});
