import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashMeasurementSnapshotBody } from "@/lib/audit-ready/measurement-snapshots/hash";
import {
  AP_AGING_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type TieOutApMeasurementSnapshot,
} from "@/lib/audit-ready/measurement-snapshots/types";
import { selectLatestCompletedTieOutRunForSyncFromCandidates } from "../baseline-sync-custody";
import type { QboApAgingResult, QboTrialBalanceResult } from "../qbo-reports";

const { fetchAging, fetchTb, persistBridge, emitWp } = vi.hoisted(() => ({
  fetchAging: vi.fn(),
  fetchTb: vi.fn(),
  persistBridge: vi.fn(async () => undefined),
  emitWp: vi.fn(async () => undefined),
}));

vi.mock("@/lib/audit-ready/tie-out/qbo-reports", () => ({
  fetchQboApAgingDetail: fetchAging,
  fetchQboTrialBalance: fetchTb,
}));

vi.mock("@/lib/audit-ready/tie-out/ar-ap-urm", () => ({
  persistApUrmBridge: persistBridge,
}));

vi.mock("@/lib/audit-ready/tie-out/emitters/_shared/emit-common", () => ({
  dualWriteWorkpaper: emitWp,
}));

vi.mock("@/lib/audit-ready/tie-out/emitters/ap-emitter", () => ({
  apEmitter: { kind: "ap_aging" },
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
          return { data: { id: "run-ap-1" }, error: null };
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(resolve({ data: null, error: null }));
        },
      };
      return chain;
    },
  }),
}));

import { runApResolver } from "../ap-resolver";

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

const agingA: QboApAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  vendors: [
    { vendor_ref: "1", vendor_display_name: "Vendor A", total_cents: 8_000 },
    { vendor_ref: "2", vendor_display_name: "Debit Vendor", total_cents: -300 },
  ],
  total_cents: 7_700,
  raw_report_url: "https://example.invalid/ap-a",
  intuit_tid: "tid-a",
};

const agingB: QboApAgingResult = {
  ...agingA,
  vendors: [{ vendor_ref: "1", vendor_display_name: "Vendor A", total_cents: 99_999 }],
  total_cents: 99_999,
  raw_report_url: "https://example.invalid/ap-b",
};

const trialA: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "33",
      account_name: "Accounts Payable",
      debit_cents: 0,
      credit_cents: 7_000,
      net_cents: -7_000,
    },
  ],
  raw_report_url: "https://example.invalid/tb-a",
  intuit_tid: "tid-tb",
};

function snapshotA(): TieOutApMeasurementSnapshot {
  const payload = {
    currency: "USD",
    vendors: [
      { entityRef: "1", displayName: "Vendor A", totalCents: 8_000 },
      { entityRef: "2", displayName: "Debit Vendor", totalCents: -300 },
    ],
    subledgerTotalCents: 7_700,
    trialBalance: [
      {
        accountRef: "33",
        accountName: "Accounts Payable",
        debitCents: 0,
        creditCents: 7_000,
        netCents: -7_000,
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
    snapshotKind: AP_AGING_SNAPSHOT_KIND,
    asOfDate: "2026-07-31",
    capturedAt: "2026-08-17T16:00:00.000Z",
    payloadHash: hashMeasurementSnapshotBody({
      schemaVersion: 1,
      snapshotKind: AP_AGING_SNAPSHOT_KIND,
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
  apAccountId: "33",
  asOfDate: "2026-07-31",
  policy,
  triggeredByUserId: "user-1",
  triggerReason: "manual" as const,
  companyId: COMPANY,
  accountingConnectionId: CONN,
  provider: "quickbooks",
};

describe("AP resolver dual measurement path", () => {
  beforeEach(() => {
    fetchAging.mockReset();
    fetchTb.mockReset();
    persistBridge.mockClear();
    emitWp.mockClear();
    runInserts.length = 0;
    fetchAging.mockResolvedValue(agingB);
    fetchTb.mockResolvedValue(trialA);
  });

  it("26-27. live and snapshot paths produce the same Math.abs totals", async () => {
    fetchAging.mockResolvedValue(agingA);
    fetchTb.mockResolvedValue(trialA);
    const live = await runApResolver({
      ...baseInput,
      measurement: { mode: "live" },
    });
    runInserts.length = 0;
    const snap = await runApResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(live.subledgerTotalCents).toBe(7_700);
    expect(live.glTotalCents).toBe(7_000);
    expect(live.totalsVarianceCents).toBe(700);
    expect(snap.subledgerTotalCents).toBe(live.subledgerTotalCents);
    expect(snap.glTotalCents).toBe(live.glTotalCents);
    expect(snap.totalsVarianceCents).toBe(live.totalsVarianceCents);
  });

  it("28-30. snapshot path stamps exact sync id, zero provider reads", async () => {
    const result = await runApResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(fetchAging).not.toHaveBeenCalled();
    expect(fetchTb).not.toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(result.measurementSource).toBe("persisted_sync_snapshot");
    expect(result.baselineSyncId).toBe(SYNC);
    expect(result.runId).toBe("run-ap-1");
    expect(result.runId).not.toBe(SYNC);
    expect(runInserts[0]?.baseline_sync_id).toBe(SYNC);
  });

  it("31. live path stamps NULL baseline_sync_id", async () => {
    fetchAging.mockResolvedValue(agingA);
    fetchTb.mockResolvedValue(trialA);
    const result = await runApResolver({
      ...baseInput,
      measurement: { mode: "live" },
    });
    expect(fetchAging).toHaveBeenCalledTimes(1);
    expect(fetchTb).toHaveBeenCalledTimes(1);
    expect(result.measurementSource).toBe("live_provider");
    expect(result.baselineSyncId).toBeNull();
    expect(runInserts[0]?.baseline_sync_id).toBeUndefined();
  });

  it("33. newer live provider state B cannot alter a snapshot-A run", async () => {
    const result = await runApResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(result.subledgerTotalCents).toBe(7_700);
    expect(result.subledgerTotalCents).not.toBe(99_999);
    expect(fetchAging).not.toHaveBeenCalled();
  });

  it("34. no persisted→live fallback on as-of mismatch", async () => {
    const result = await runApResolver({
      ...baseInput,
      asOfDate: "2026-06-30",
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("measurement_snapshot_as_of_mismatch");
    expect(result.baselineSyncId).toBeNull();
    expect(fetchAging).not.toHaveBeenCalled();
    expect(runInserts).toHaveLength(0);
  });

  it("35. AP URM bridge still runs after measurement", async () => {
    await runApResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(persistBridge).toHaveBeenCalledTimes(1);
    expect(emitWp).toHaveBeenCalledTimes(1);
  });

  it("AR+AP same sync: CC selectors find both kinds independently", () => {
    const arRun = selectLatestCompletedTieOutRunForSyncFromCandidates(
      [
        {
          id: "run-ar",
          status: "completed",
          completedAt: "2026-08-17T16:00:00.000Z",
          baselineSyncId: SYNC,
        },
        {
          id: "run-live",
          status: "completed",
          completedAt: "2026-08-17T18:00:00.000Z",
          baselineSyncId: null,
        },
      ],
      { baselineSyncId: SYNC },
    );
    const apRun = selectLatestCompletedTieOutRunForSyncFromCandidates(
      [
        {
          id: "run-ap",
          status: "completed",
          completedAt: "2026-08-17T16:05:00.000Z",
          baselineSyncId: SYNC,
        },
        {
          id: "run-live-ap",
          status: "completed",
          completedAt: "2026-08-17T18:05:00.000Z",
          baselineSyncId: null,
        },
      ],
      { baselineSyncId: SYNC },
    );
    expect(arRun?.id).toBe("run-ar");
    expect(apRun?.id).toBe("run-ap");
    expect(arRun?.baselineSyncId).toBe(SYNC);
    expect(apRun?.baselineSyncId).toBe(SYNC);
  });
});
