import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashMeasurementSnapshotBody } from "@/lib/audit-ready/measurement-snapshots/hash";
import {
  INVENTORY_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type TieOutInventoryMeasurementSnapshot,
} from "@/lib/audit-ready/measurement-snapshots/types";
import { selectLatestCompletedTieOutRunForSyncFromCandidates } from "../baseline-sync-custody";
import type { QboInventoryValuationResult, QboTrialBalanceResult } from "../qbo-reports";

const { fetchValuation, fetchTb, persistBridge, emitWp } = vi.hoisted(() => ({
  fetchValuation: vi.fn(),
  fetchTb: vi.fn(),
  persistBridge: vi.fn(async () => undefined),
  emitWp: vi.fn(async () => undefined),
}));

vi.mock("@/lib/audit-ready/tie-out/qbo-reports", () => ({
  fetchQboInventoryValuationDetail: fetchValuation,
  fetchQboTrialBalance: fetchTb,
}));

vi.mock("@/lib/audit-ready/tie-out/inventory-fa-urm", () => ({
  persistInventoryUrmBridge: persistBridge,
}));

vi.mock("@/lib/audit-ready/tie-out/emitters/_shared/emit-common", () => ({
  dualWriteWorkpaper: emitWp,
}));

vi.mock("@/lib/audit-ready/tie-out/emitters/inventory-emitter", () => ({
  inventoryEmitter: { kind: "inventory" },
}));

const runInserts: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {
        insert(row: Record<string, unknown>) {
          if (table === "audit_ready_tie_out_runs") runInserts.push(row);
          return chain;
        },
        select() {
          return chain;
        },
        update() {
          return chain;
        },
        eq() {
          return chain;
        },
        async single() {
          return { data: { id: "run-inv-1" }, error: null };
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(resolve({ data: null, error: null }));
        },
      };
      return chain;
    },
  }),
}));

import { runInventoryResolver } from "../inventory-resolver";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const policy = {
  policy_mode: "standard",
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 50,
  kickout_min_percent: 0.05,
  authoritative_comparison: "tighter_of_both" as const,
};

const valuationA: QboInventoryValuationResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  items: [
    { item_ref: "1", item_display_name: "Widget", qty_on_hand: 10, asset_value_cents: 5_000 },
    { item_ref: "2", item_display_name: "Neg Qty", qty_on_hand: -1, asset_value_cents: 100 },
  ],
  total_cents: 5_100,
  raw_report_url: "https://example.invalid/inv-a",
  intuit_tid: "tid-a",
};

const valuationB: QboInventoryValuationResult = {
  ...valuationA,
  items: [{ item_ref: "1", item_display_name: "Widget", qty_on_hand: 99, asset_value_cents: 99_999 }],
  total_cents: 99_999,
};

const trialA: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "81",
      account_name: "Inventory",
      debit_cents: 4_800,
      credit_cents: 0,
      net_cents: 4_800,
    },
  ],
  raw_report_url: "https://example.invalid/tb-a",
  intuit_tid: "tid-tb",
};

function snapshotA(): TieOutInventoryMeasurementSnapshot {
  const payload = {
    currency: "USD",
    items: [
      { entityRef: "1", displayName: "Widget", quantityOnHand: 10, assetValueCents: 5_000 },
      { entityRef: "2", displayName: "Neg Qty", quantityOnHand: -1, assetValueCents: 100 },
    ],
    subledgerTotalCents: 5_100,
    trialBalance: [
      {
        accountRef: "81",
        accountName: "Inventory",
        debitCents: 4_800,
        creditCents: 0,
        netCents: 4_800,
      },
    ],
  };
  return {
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    accountingSyncId: SYNC,
    accountingConnectionId: CONN,
    companyId: COMPANY,
    provider: "quickbooks",
    tenantOrRealmId: "realm-1",
    snapshotKind: INVENTORY_SNAPSHOT_KIND,
    asOfDate: "2026-07-31",
    capturedAt: "2026-08-17T16:00:00.000Z",
    payloadHash: hashMeasurementSnapshotBody({
      schemaVersion: 1,
      snapshotKind: INVENTORY_SNAPSHOT_KIND,
      asOfDate: "2026-07-31",
      payload,
    }),
    sourceRequestIds: {
      agingIntuitTid: "tid-a",
      trialBalanceIntuitTid: "tid-tb",
    },
    payload,
  };
}

const baseInput = {
  engagementId: "eng-1",
  pbcRequestId: "pbc-1",
  realmId: "realm-1",
  accessToken: "tok",
  inventoryAccountId: "81",
  asOfDate: "2026-07-31",
  policy,
  triggeredByUserId: "user-1",
  triggerReason: "manual" as const,
  companyId: COMPANY,
  accountingConnectionId: CONN,
  provider: "quickbooks",
};

describe("Inventory resolver dual measurement path", () => {
  beforeEach(() => {
    fetchValuation.mockReset();
    fetchTb.mockReset();
    persistBridge.mockClear();
    emitWp.mockClear();
    runInserts.length = 0;
    fetchValuation.mockResolvedValue(valuationB);
    fetchTb.mockResolvedValue(trialA);
  });

  it("28-29. live and snapshot paths produce the same signed totals", async () => {
    fetchValuation.mockResolvedValue(valuationA);
    fetchTb.mockResolvedValue(trialA);
    const live = await runInventoryResolver({
      ...baseInput,
      measurement: { mode: "live" },
    });
    runInserts.length = 0;
    const snap = await runInventoryResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(live.subledgerTotalCents).toBe(5_100);
    expect(live.glTotalCents).toBe(4_800);
    expect(live.totalsVarianceCents).toBe(300);
    expect(snap.subledgerTotalCents).toBe(live.subledgerTotalCents);
    expect(snap.glTotalCents).toBe(live.glTotalCents);
    expect(snap.totalsVarianceCents).toBe(live.totalsVarianceCents);
  });

  it("35. live path stamps NULL baseline_sync_id", async () => {
    fetchValuation.mockResolvedValue(valuationA);
    const result = await runInventoryResolver({
      ...baseInput,
      measurement: { mode: "live" },
    });
    expect(fetchValuation).toHaveBeenCalledTimes(1);
    expect(fetchTb).toHaveBeenCalledTimes(1);
    expect(result.measurementSource).toBe("live_provider");
    expect(result.baselineSyncId).toBeNull();
    expect(runInserts[0]?.baseline_sync_id).toBeUndefined();
  });

  it("36-38. snapshot path stamps exact sync id, zero provider reads", async () => {
    const result = await runInventoryResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(fetchValuation).not.toHaveBeenCalled();
    expect(fetchTb).not.toHaveBeenCalled();
    expect(result.measurementSource).toBe("persisted_sync_snapshot");
    expect(result.baselineSyncId).toBe(SYNC);
    expect(result.runId).toBe("run-inv-1");
    expect(result.runId).not.toBe(SYNC);
    expect(runInserts[0]?.baseline_sync_id).toBe(SYNC);
  });

  it("39. no persisted→live fallback on as-of mismatch", async () => {
    const result = await runInventoryResolver({
      ...baseInput,
      asOfDate: "2026-06-30",
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("measurement_snapshot_as_of_mismatch");
    expect(fetchValuation).not.toHaveBeenCalled();
    expect(runInserts).toHaveLength(0);
  });

  it("40. Inventory URM bridge still runs after measurement", async () => {
    await runInventoryResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(persistBridge).toHaveBeenCalledTimes(1);
    expect(emitWp).toHaveBeenCalledTimes(1);
  });

  it("shared-sync: CC selectors find AR, AP, and Inventory independently", () => {
    const inventoryRun = selectLatestCompletedTieOutRunForSyncFromCandidates(
      [
        {
          id: "run-inv",
          status: "completed",
          completedAt: "2026-08-17T16:10:00.000Z",
          baselineSyncId: SYNC,
        },
        {
          id: "run-live-inv",
          status: "completed",
          completedAt: "2026-08-17T18:10:00.000Z",
          baselineSyncId: null,
        },
      ],
      { baselineSyncId: SYNC },
    );
    expect(inventoryRun?.id).toBe("run-inv");
    expect(inventoryRun?.baselineSyncId).toBe(SYNC);
  });
});
