import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashMeasurementSnapshotBody } from "@/lib/audit-ready/measurement-snapshots/hash";
import {
  AR_AGING_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type TieOutArMeasurementSnapshot,
} from "@/lib/audit-ready/measurement-snapshots/types";
import { selectLatestCompletedTieOutRunForSyncFromCandidates } from "../baseline-sync-custody";
import type { QboArAgingResult, QboTrialBalanceResult } from "../qbo-reports";

const { fetchAging, fetchTb, persistBridge, emitWp } = vi.hoisted(() => ({
  fetchAging: vi.fn(),
  fetchTb: vi.fn(),
  persistBridge: vi.fn(async () => undefined),
  emitWp: vi.fn(async () => undefined),
}));

vi.mock("@/lib/audit-ready/tie-out/qbo-reports", () => ({
  fetchQboArAgingDetail: fetchAging,
  fetchQboTrialBalance: fetchTb,
}));

vi.mock("@/lib/audit-ready/tie-out/ar-ap-urm", () => ({
  persistArUrmBridge: persistBridge,
}));

vi.mock("@/lib/audit-ready/tie-out/emitters/_shared/emit-common", () => ({
  dualWriteWorkpaper: emitWp,
}));

vi.mock("@/lib/audit-ready/tie-out/emitters/ar-emitter", () => ({
  arEmitter: { kind: "ar_aging" },
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
          return { data: { id: "run-ar-1" }, error: null };
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve(resolve({ data: null, error: null }));
        },
      };
      return chain;
    },
  }),
}));

import { runArResolver } from "../ar-resolver";

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

const agingA: QboArAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  customers: [{ customer_ref: "1", customer_display_name: "Acme", total_cents: 10_000 }],
  total_cents: 10_000,
  raw_report_url: "https://example.invalid/ar-a",
  intuit_tid: "tid-a",
};

const agingB: QboArAgingResult = {
  ...agingA,
  customers: [{ customer_ref: "1", customer_display_name: "Acme", total_cents: 99_999 }],
  total_cents: 99_999,
  raw_report_url: "https://example.invalid/ar-b",
};

const trialA: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "84",
      account_name: "Accounts Receivable",
      debit_cents: 10_000,
      credit_cents: 0,
      net_cents: 10_000,
    },
  ],
  raw_report_url: "https://example.invalid/tb-a",
  intuit_tid: "tid-tb",
};

function snapshotA(): TieOutArMeasurementSnapshot {
  const payload = {
    currency: "USD",
    customers: [{ entityRef: "1", displayName: "Acme", totalCents: 10_000 }],
    subledgerTotalCents: 10_000,
    trialBalance: [
      {
        accountRef: "84",
        accountName: "Accounts Receivable",
        debitCents: 10_000,
        creditCents: 0,
        netCents: 10_000,
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
    snapshotKind: AR_AGING_SNAPSHOT_KIND,
    asOfDate: "2026-07-31",
    capturedAt: "2026-08-17T16:00:00.000Z",
    payloadHash: hashMeasurementSnapshotBody({
      schemaVersion: 1,
      snapshotKind: AR_AGING_SNAPSHOT_KIND,
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
  arAccountId: "84",
  asOfDate: "2026-07-31",
  policy,
  triggeredByUserId: "user-1",
  triggerReason: "manual" as const,
  companyId: COMPANY,
  accountingConnectionId: CONN,
  provider: "quickbooks",
};

describe("AR resolver dual measurement path", () => {
  beforeEach(() => {
    fetchAging.mockReset();
    fetchTb.mockReset();
    persistBridge.mockClear();
    emitWp.mockClear();
    runInserts.length = 0;
    fetchAging.mockResolvedValue(agingB);
    fetchTb.mockResolvedValue(trialA);
  });

  it("9-13. snapshot path does not fetch QBO, uses snapshot A, stamps that sync id", async () => {
    const result = await runArResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(fetchAging).not.toHaveBeenCalled();
    expect(fetchTb).not.toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(result.subledgerTotalCents).toBe(10_000);
    expect(result.totalsVarianceCents).toBe(0);
    expect(result.measurementSource).toBe("persisted_sync_snapshot");
    expect(result.baselineSyncId).toBe(SYNC);
    expect(result.runId).toBe("run-ar-1");
    expect(result.runId).not.toBe(SYNC);
    expect(runInserts[0]?.baseline_sync_id).toBe(SYNC);
  });

  it("11. newer live provider state B cannot alter a snapshot-A run", async () => {
    fetchAging.mockResolvedValue(agingB);
    const result = await runArResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(result.subledgerTotalCents).toBe(10_000);
    expect(result.subledgerTotalCents).not.toBe(99_999);
    expect(fetchAging).not.toHaveBeenCalled();
  });

  it("14-15. explicit live path fetches and leaves baseline_sync_id null", async () => {
    fetchAging.mockResolvedValue(agingA);
    fetchTb.mockResolvedValue(trialA);
    const result = await runArResolver({
      ...baseInput,
      measurement: { mode: "live" },
    });
    expect(fetchAging).toHaveBeenCalledTimes(1);
    expect(fetchTb).toHaveBeenCalledTimes(1);
    expect(result.measurementSource).toBe("live_provider");
    expect(result.baselineSyncId).toBeNull();
    expect(runInserts[0]?.baseline_sync_id).toBeUndefined();
  });

  it("16. snapshot asOf != resolver asOf fails closed without fetch or stamp", async () => {
    const result = await runArResolver({
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

  it("17. custody mismatch fails closed", async () => {
    const result = await runArResolver({
      ...baseInput,
      companyId: "other-company",
      measurement: { mode: "persisted_snapshot", snapshot: snapshotA() },
    });
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("measurement_snapshot_custody_mismatch");
    expect(fetchAging).not.toHaveBeenCalled();
  });

  it("18. hash mismatch fails closed", async () => {
    const snap = snapshotA();
    snap.payload = { ...snap.payload, subledgerTotalCents: 1 };
    const result = await runArResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snap },
    });
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("measurement_snapshot_hash_mismatch");
    expect(fetchAging).not.toHaveBeenCalled();
  });

  it("19. empty accountingSyncId fails closed", async () => {
    const snap = snapshotA();
    snap.accountingSyncId = "";
    const result = await runArResolver({
      ...baseInput,
      measurement: { mode: "persisted_snapshot", snapshot: snap },
    });
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("measurement_snapshot_sync_id_missing");
  });

  it("20-21. CC selector finds snapshot-backed AR; newer null live run cannot hide it", () => {
    const selected = selectLatestCompletedTieOutRunForSyncFromCandidates(
      [
        {
          id: "run-live-newer",
          status: "completed",
          completedAt: "2026-08-17T18:00:00.000Z",
          baselineSyncId: null,
        },
        {
          id: "run-ar-1",
          status: "completed",
          completedAt: "2026-08-17T16:00:00.000Z",
          baselineSyncId: SYNC,
        },
      ],
      { baselineSyncId: SYNC },
    );
    expect(selected?.id).toBe("run-ar-1");
    expect(selected?.baselineSyncId).toBe(SYNC);
  });
});
