import { describe, expect, it } from "vitest";
import {
  loadExactClosePeriodIdForApproval,
  resolveApprovalClosePeriodId,
} from "../approval-custody";

describe("JE-2 exact close-period receipt custody", () => {
  it("returns exact close period id when firm_client + start + end match", async () => {
    const CLOSE = "cp-exact-1";
    const id = await resolveApprovalClosePeriodId({
      firmClientId: "fc-1",
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: "sync-1",
      loadSyncBounds: async ({ accountingSyncId, expectedPeriodEnd }) => {
        expect(accountingSyncId).toBe("sync-1");
        return { periodStart: "2026-07-01", periodEnd: expectedPeriodEnd };
      },
      loadClosePeriodId: async (args) => {
        expect(args).toEqual({
          firmClientId: "fc-1",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-31",
        });
        return CLOSE;
      },
    });
    expect(id).toBe(CLOSE);
  });

  it("returns null when no exact close period exists", async () => {
    const id = await resolveApprovalClosePeriodId({
      firmClientId: "fc-1",
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: "sync-1",
      loadSyncBounds: async () => ({
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      }),
      loadClosePeriodId: async () => null,
    });
    expect(id).toBeNull();
  });

  it("returns null when firm_client_id missing", async () => {
    const id = await resolveApprovalClosePeriodId({
      firmClientId: null,
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: "sync-1",
      loadSyncBounds: async () => {
        throw new Error("should not load sync without firm client");
      },
      loadClosePeriodId: async () => {
        throw new Error("should not load close period");
      },
    });
    expect(id).toBeNull();
  });

  it("returns null when source sync has no period_start", async () => {
    const id = await resolveApprovalClosePeriodId({
      firmClientId: "fc-1",
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: "sync-1",
      loadSyncBounds: async () => ({
        periodStart: null,
        periodEnd: "2026-07-31",
      }),
      loadClosePeriodId: async () => {
        throw new Error("should not query close period without period_start");
      },
    });
    expect(id).toBeNull();
  });

  it("does not select wrong firm_client / period_start / period_end", async () => {
    const calls: Array<Record<string, string | null>> = [];
    const id = await resolveApprovalClosePeriodId({
      firmClientId: "fc-wanted",
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: "sync-1",
      loadSyncBounds: async () => ({
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      }),
      loadClosePeriodId: async (args) => {
        calls.push(args);
        if (
          args.firmClientId === "fc-wanted" &&
          args.periodStart === "2026-07-01" &&
          args.periodEnd === "2026-07-31"
        ) {
          return "cp-ok";
        }
        return null;
      },
    });
    expect(id).toBe("cp-ok");
    expect(calls).toEqual([
      {
        firmClientId: "fc-wanted",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      },
    ]);
    // Wrong keys are not selected by the exact triple:
    expect(
      await resolveApprovalClosePeriodId({
        firmClientId: "fc-other",
        periodEnd: "2026-07-31",
        sourceAccountingSyncId: "sync-1",
        loadSyncBounds: async () => ({
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
        }),
        loadClosePeriodId: async (args) => {
          if (
            args.firmClientId === "fc-wanted" &&
            args.periodStart === "2026-07-01" &&
            args.periodEnd === "2026-07-31"
          ) {
            return "cp-ok";
          }
          return null;
        },
      }),
    ).toBeNull();
  });

  it("never returns period_end as close_period_id", async () => {
    const id = await resolveApprovalClosePeriodId({
      firmClientId: "fc-1",
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: "sync-1",
      loadSyncBounds: async () => ({
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      }),
      loadClosePeriodId: async () => "2026-07-31",
    });
    expect(id).toBeNull();
  });

  it("uses exact proposal source sync id for period bounds", async () => {
    let seenSync: string | null = null;
    await resolveApprovalClosePeriodId({
      firmClientId: "fc-1",
      periodEnd: "2026-07-31",
      sourceAccountingSyncId: "exact-sync-id",
      loadSyncBounds: async ({ accountingSyncId }) => {
        seenSync = accountingSyncId;
        return { periodStart: "2026-07-01", periodEnd: "2026-07-31" };
      },
      loadClosePeriodId: async () => "cp-1",
    });
    expect(seenSync).toBe("exact-sync-id");
  });

  it("loadExactClosePeriodIdForApproval returns null without all three keys", async () => {
    expect(
      await loadExactClosePeriodIdForApproval({
        firmClientId: null,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      }),
    ).toBeNull();
    expect(
      await loadExactClosePeriodIdForApproval({
        firmClientId: "fc-1",
        periodStart: null,
        periodEnd: "2026-07-31",
      }),
    ).toBeNull();
  });
});
