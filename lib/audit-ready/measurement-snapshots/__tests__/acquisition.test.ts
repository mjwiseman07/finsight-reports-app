import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  acquireAndPersistAccountingStateWithArSnapshot,
  type ArAcquisitionDeps,
} from "../acquisition";
import { captureAndPersistArMeasurementSnapshot } from "../capture";
import {
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
} from "../types";
import type { QboArAgingResult, QboTrialBalanceResult } from "@/lib/audit-ready/tie-out/qbo-reports";
import type { ProviderRawReports } from "@/lib/integrations/accounting/types";
import { selectLatestCompletedTieOutRunForSyncFromCandidates } from "@/lib/audit-ready/tie-out/baseline-sync-custody";

const OLD_SYNC = "00000000-0000-4000-8000-000000000000";
const NEW_SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const agingA: QboArAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  customers: [{ customer_ref: "1", customer_display_name: "Acme", total_cents: 10_000 }],
  total_cents: 10_000,
  raw_report_url: "https://example.invalid/ar",
  intuit_tid: "tid-a",
};

const agingB: QboArAgingResult = {
  ...agingA,
  customers: [{ customer_ref: "1", customer_display_name: "Acme", total_cents: 99_999 }],
  total_cents: 99_999,
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
  raw_report_url: "https://example.invalid/tb",
  intuit_tid: "tid-tb",
};

const connection = {
  id: CONN,
  user_id: "user-1",
  provider: "quickbooks" as const,
  tenant_or_realm_id: "realm-1",
  access_token: "tok",
  external_entity_id: "realm-1",
  external_entity_name: "Acme",
  metadata_json: {},
};

const input = {
  connection,
  userId: "user-1",
  asOfDate: "2026-07-31",
  reportPeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
};

function deps(over: Partial<ArAcquisitionDeps> = {}): ArAcquisitionDeps {
  const order: string[] = [];
  const base: ArAcquisitionDeps = {
    ensureConnection: async (row) => row,
    fetchScorecardRawReports: async () => {
      order.push("scorecard_fetch");
      return { sourceSystem: "quickbooks" } as unknown as ProviderRawReports;
    },
    fetchUrmArReports: async () => {
      order.push("urm_fetch");
      return { aging: agingA, trial: trialA };
    },
    normalizeScorecard: async ({ syncId }) => {
      order.push(`normalize:${syncId}`);
      return {
        normalizedBalanceSheet: [{ label: "Assets" }],
        normalizedIncomeStatement: [{ label: "Revenue" }],
      };
    },
    persistSync: async ({ syncId, reportPeriod }) => {
      order.push(`persist_sync:${syncId}`);
      return {
        syncId,
        companyId: COMPANY,
        connectionId: CONN,
        tenantId: "realm-1",
        reportPeriodEnd: reportPeriod.endDate,
      };
    },
    persistSnapshot: async (snapshot) => {
      order.push(`persist_snapshot:${snapshot.accountingSyncId}`);
      return { snapshot, reused: false };
    },
    generateSyncId: () => NEW_SYNC,
  };
  const merged = { ...base, ...over };
  (merged as ArAcquisitionDeps & { order: string[] }).order = order;
  return merged;
}

describe("AR acquisition coupling", () => {
  it("1-2. preexisting period-matched sync + token is not capture authority", async () => {
    await expect(
      captureAndPersistArMeasurementSnapshot({
        accountingSyncId: OLD_SYNC,
        accessToken: "tok",
        asOfDate: "2026-07-31",
      }),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.PREEXISTING_SYNC_NOT_AUTHORITY,
    });
    await expect(
      acquireAndPersistAccountingStateWithArSnapshot({
        ...input,
        accountingSyncId: OLD_SYNC,
      } as never),
    ).rejects.toBeInstanceOf(MeasurementSnapshotError);
  });

  it("3-6. one acquisition bundle produces sync + snapshot from fetches that happen before persist", async () => {
    const wired = deps();
    const order = (wired as ArAcquisitionDeps & { order: string[] }).order;
    const result = await acquireAndPersistAccountingStateWithArSnapshot(input, wired);
    expect(result.accountingSync.syncId).toBe(NEW_SYNC);
    expect(result.arMeasurementSnapshot.accountingSyncId).toBe(NEW_SYNC);
    expect(result.arMeasurementSnapshot.accountingSyncId).not.toBe(OLD_SYNC);
    expect(result.arMeasurementSnapshot.payload.subledgerTotalCents).toBe(10_000);
    expect(order.indexOf("scorecard_fetch")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("urm_fetch")).toBeGreaterThan(order.indexOf("scorecard_fetch") - 1);
    expect(order.indexOf("persist_sync:11111111-1111-4111-8111-111111111111")).toBeGreaterThan(
      order.indexOf("urm_fetch"),
    );
    expect(order.indexOf("persist_snapshot:11111111-1111-4111-8111-111111111111")).toBeGreaterThan(
      order.indexOf("persist_sync:11111111-1111-4111-8111-111111111111"),
    );
    expect(wired.fetchUrmArReports).toBeTruthy();
  });

  it("5-6. no provider fetch after sync persistence", async () => {
    let fetchedAfterPersist = false;
    let persisted = false;
    const wired = deps({
      fetchUrmArReports: async () => {
        if (persisted) fetchedAfterPersist = true;
        return { aging: agingA, trial: trialA };
      },
      persistSync: async ({ syncId, reportPeriod }) => {
        persisted = true;
        return {
          syncId,
          companyId: COMPANY,
          connectionId: CONN,
          tenantId: "realm-1",
          reportPeriodEnd: reportPeriod.endDate,
        };
      },
    });
    await acquireAndPersistAccountingStateWithArSnapshot(input, wired);
    expect(fetchedAfterPersist).toBe(false);
  });

  it("7. later provider state B cannot change the frozen snapshot payload", async () => {
    let aging = agingA;
    const wired = deps({
      fetchUrmArReports: async () => ({ aging, trial: trialA }),
    });
    const result = await acquireAndPersistAccountingStateWithArSnapshot(input, wired);
    aging = agingB;
    expect(result.arMeasurementSnapshot.payload.subledgerTotalCents).toBe(10_000);
  });

  it("8. period mismatch fails closed before persist", async () => {
    const persistSync = vi.fn();
    const wired = deps({ persistSync });
    await expect(
      acquireAndPersistAccountingStateWithArSnapshot(
        {
          ...input,
          asOfDate: "2026-07-31",
          reportPeriod: { startDate: "2026-06-01", endDate: "2026-06-30" },
        },
        wired,
      ),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.SYNC_PERIOD_MISMATCH,
    });
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("9. sync persist success + snapshot persist fail is not CC-authoritative", async () => {
    const wired = deps({
      persistSnapshot: async () => {
        throw new Error("snapshot write failed");
      },
    });
    await expect(acquireAndPersistAccountingStateWithArSnapshot(input, wired)).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.PERSIST_FAILED,
    });
  });

  it("does not persist a fake AR/TB-only accounting_syncs row", async () => {
    const persistSync = vi.fn();
    const wired = deps({
      normalizeScorecard: async () => ({
        normalizedBalanceSheet: [],
        normalizedIncomeStatement: [],
      }),
      persistSync,
    });
    await expect(acquireAndPersistAccountingStateWithArSnapshot(input, wired)).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.CORE_STATEMENTS_MISSING,
    });
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("source lock: capture no longer attaches later fetches to an existing sync", () => {
    const capture = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/capture.ts"),
      "utf8",
    );
    const repo = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/repository.ts"),
      "utf8",
    );
    expect(capture).toContain("PREEXISTING_SYNC_NOT_AUTHORITY");
    expect(capture).not.toContain("requirePeriodMatchedAccountingSyncForAr");
    expect(repo).not.toContain("requirePeriodMatchedAccountingSyncForAr");
    expect(repo).toContain("Period equality is a validation condition, not capture authority");
  });
});

describe("snapshot replay remains zero-provider after acquisition", () => {
  it("20-21 style: CC selector still finds snapshot-backed AR; live null cannot hide it", () => {
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
          baselineSyncId: NEW_SYNC,
        },
      ],
      { baselineSyncId: NEW_SYNC },
    );
    expect(selected?.id).toBe("run-ar-1");
  });
});
