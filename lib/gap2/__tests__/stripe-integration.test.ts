import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const sendPurgeMock = vi.hoisted(() => vi.fn());
const sendReactivateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock, rpc: rpcMock }),
}));
vi.mock("@/lib/gap2/notifications", () => ({
  sendPurgeScheduledEmail: sendPurgeMock,
  sendReactivationConfirmedEmail: sendReactivateMock,
}));

import {
  cancelGap2Purge,
  resolveFirmIdFromSubscription,
  scheduleGap2Purge,
} from "../stripe-integration";

describe("gap2 stripe-integration", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    sendPurgeMock.mockReset();
    sendReactivateMock.mockReset();
    sendPurgeMock.mockResolvedValue(undefined);
    sendReactivateMock.mockResolvedValue(undefined);
  });

  it("resolveFirmIdFromSubscription returns firm subscriber only", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { subscriber_id: "firm-1", subscriber_type: "firm" },
            error: null,
          }),
        }),
      }),
    });
    await expect(resolveFirmIdFromSubscription("sub_x")).resolves.toBe("firm-1");
  });

  it("scheduleGap2Purge is idempotent when schedule already exists", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "subscription_purge_schedule") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: "existing" }, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    });
    const id = await scheduleGap2Purge({
      firm_id: "firm-1",
      stripe_subscription_id: "sub_x",
      reason: "stripe_subscription_deleted",
    });
    expect(id).toBe("existing");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("cancelGap2Purge calls rpc and emails on success", async () => {
    rpcMock.mockResolvedValue({ data: "sched-1", error: null });
    const id = await cancelGap2Purge({
      firm_id: "firm-1",
      reason: "stripe_subscription_reactivated",
    });
    expect(id).toBe("sched-1");
    expect(rpcMock).toHaveBeenCalledWith(
      "gap2_cancel_purge",
      expect.objectContaining({ p_firm_id: "firm-1" }),
    );
  });
});
