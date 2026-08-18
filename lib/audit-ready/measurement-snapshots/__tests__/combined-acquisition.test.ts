import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  acquireAndPersistAccountingStateWithArApSnapshots,
  type ArApAcquisitionDeps,
} from "../acquisition";
import {
  CombinedAcquisitionPartialError,
  MEASUREMENT_SNAPSHOT_ERROR,
} from "../types";
import type { QboApAgingResult, QboArAgingResult, QboTrialBalanceResult } from "@/lib/audit-ready/tie-out/qbo-reports";
import type { ProviderRawReports } from "@/lib/integrations/accounting/types";

const OLD_SYNC = "00000000-0000-4000-8000-000000000000";
const NEW_SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const arAgingA: QboArAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  customers: [{ customer_ref: "1", customer_display_name: "Acme", total_cents: 10_000 }],
  total_cents: 10_000,
  raw_report_url: "https://example.invalid/ar",
  intuit_tid: "tid-ar",
};

const apAgingA: QboApAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  vendors: [{ vendor_ref: "9", vendor_display_name: "Vendor A", total_cents: 8_000 }],
  total_cents: 8_000,
  raw_report_url: "https://example.invalid/ap",
  intuit_tid: "tid-ap",
};

const apAgingB: QboApAgingResult = {
  ...apAgingA,
  vendors: [{ vendor_ref: "9", vendor_display_name: "Vendor A", total_cents: 99_999 }],
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
    {
      account_ref: "33",
      account_name: "Accounts Payable",
      debit_cents: 0,
      credit_cents: 8_000,
      net_cents: -8_000,
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

function deps(over: Partial<ArApAcquisitionDeps> = {}): ArApAcquisitionDeps {
  const order: string[] = [];
  const base: ArApAcquisitionDeps = {
    ensureConnection: async (row) => row,
    fetchScorecardRawReports: async () => {
      order.push("scorecard_fetch");
      return { sourceSystem: "quickbooks" } as unknown as ProviderRawReports;
    },
    fetchUrmArAging: async () => {
      order.push("ar_aging_fetch");
      return arAgingA;
    },
    fetchUrmApAging: async () => {
      order.push("ap_aging_fetch");
      return apAgingA;
    },
    fetchUrmTrialBalance: async () => {
      order.push("tb_fetch");
      return trialA;
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
    persistArSnapshot: async (snapshot) => {
      order.push(`persist_ar:${snapshot.accountingSyncId}`);
      return { snapshot, reused: false };
    },
    persistApSnapshot: async (snapshot) => {
      order.push(`persist_ap:${snapshot.accountingSyncId}`);
      return { snapshot, reused: false };
    },
    generateSyncId: () => NEW_SYNC,
  };
  const merged = { ...base, ...over };
  (merged as ArApAcquisitionDeps & { order: string[] }).order = order;
  return merged;
}

describe("combined AR+AP acquisition", () => {
  it("1-6. fetches Scorecard+AR+AP+one TB before persist; both snapshots share the new sync", async () => {
    const wired = deps();
    const order = (wired as ArApAcquisitionDeps & { order: string[] }).order;
    const result = await acquireAndPersistAccountingStateWithArApSnapshots(input, wired);
    expect(result.accountingSync.syncId).toBe(NEW_SYNC);
    expect(result.arMeasurementSnapshot.accountingSyncId).toBe(NEW_SYNC);
    expect(result.apMeasurementSnapshot.accountingSyncId).toBe(NEW_SYNC);
    expect(result.arMeasurementSnapshot.accountingSyncId).toBe(
      result.apMeasurementSnapshot.accountingSyncId,
    );
    expect(order.filter((step) => step === "tb_fetch")).toHaveLength(1);
    expect(order).toEqual(
      expect.arrayContaining([
        "scorecard_fetch",
        "ar_aging_fetch",
        "ap_aging_fetch",
        "tb_fetch",
      ]),
    );
    const persistSyncAt = order.indexOf(`persist_sync:${NEW_SYNC}`);
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("scorecard_fetch"));
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("ar_aging_fetch"));
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("ap_aging_fetch"));
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("tb_fetch"));
    expect(order.indexOf(`persist_ar:${NEW_SYNC}`)).toBeGreaterThan(persistSyncAt);
    expect(order.indexOf(`persist_ap:${NEW_SYNC}`)).toBeGreaterThan(
      order.indexOf(`persist_ar:${NEW_SYNC}`),
    );
  });

  it("3. shared Trial Balance is the same frozen capture for AR and AP snapshots", async () => {
    const result = await acquireAndPersistAccountingStateWithArApSnapshots(input, deps());
    expect(result.arMeasurementSnapshot.payload.trialBalance).toEqual(
      result.apMeasurementSnapshot.payload.trialBalance,
    );
    expect(result.arMeasurementSnapshot.payload.trialBalance[1]?.accountRef).toBe("33");
    expect(result.apMeasurementSnapshot.payload.trialBalance[0]?.accountRef).toBe("84");
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/acquisition.ts"),
      "utf8",
    );
    const persistArAp = src.slice(
      src.indexOf("export async function persistAcquiredAccountingStateWithArApSnapshots("),
      src.indexOf("export async function acquireAndPersistAccountingStateWithArApSnapshots("),
    );
    expect(persistArAp).toContain("const sharedTrialBalance = bundle.urmTrialBalance");
    expect(persistArAp.match(/trial:\s*sharedTrialBalance/g)?.length).toBe(2);
  });

  it("2. no provider fetch after sync persistence", async () => {
    let persisted = false;
    let fetchedAfterPersist = false;
    const wired = deps({
      fetchUrmApAging: async () => {
        if (persisted) fetchedAfterPersist = true;
        return apAgingA;
      },
      fetchUrmArAging: async () => {
        if (persisted) fetchedAfterPersist = true;
        return arAgingA;
      },
      fetchUrmTrialBalance: async () => {
        if (persisted) fetchedAfterPersist = true;
        return trialA;
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
    await acquireAndPersistAccountingStateWithArApSnapshots(input, wired);
    expect(fetchedAfterPersist).toBe(false);
  });

  it("7. pre-existing sync cannot authorize combined capture", async () => {
    await expect(
      acquireAndPersistAccountingStateWithArApSnapshots({
        ...input,
        accountingSyncId: OLD_SYNC,
      } as never),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.PREEXISTING_SYNC_NOT_AUTHORITY,
    });
  });

  it("8. period mismatch fails closed before persist", async () => {
    const persistSync = vi.fn();
    const wired = deps({ persistSync });
    await expect(
      acquireAndPersistAccountingStateWithArApSnapshots(
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

  it("9. missing BS/IS prevents sync persist", async () => {
    const persistSync = vi.fn();
    const wired = deps({
      normalizeScorecard: async () => ({
        normalizedBalanceSheet: [],
        normalizedIncomeStatement: [],
      }),
      persistSync,
    });
    await expect(
      acquireAndPersistAccountingStateWithArApSnapshots(input, wired),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.CORE_STATEMENTS_MISSING,
    });
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("10. AP fetch failure prevents combined successful acquisition", async () => {
    const persistSync = vi.fn();
    const wired = deps({
      fetchUrmApAging: async () => {
        throw new Error("ap aging failed");
      },
      persistSync,
    });
    await expect(
      acquireAndPersistAccountingStateWithArApSnapshots(input, wired),
    ).rejects.toThrow(/ap aging failed/);
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("11. TB failure prevents both authoritative snapshots", async () => {
    const persistArSnapshot = vi.fn();
    const persistApSnapshot = vi.fn();
    const wired = deps({
      fetchUrmTrialBalance: async () => {
        throw new Error("tb failed");
      },
      persistArSnapshot,
      persistApSnapshot,
    });
    await expect(
      acquireAndPersistAccountingStateWithArApSnapshots(input, wired),
    ).rejects.toThrow(/tb failed/);
    expect(persistArSnapshot).not.toHaveBeenCalled();
    expect(persistApSnapshot).not.toHaveBeenCalled();
  });

  it("12. sync persist failure prevents snapshots", async () => {
    const persistArSnapshot = vi.fn();
    const persistApSnapshot = vi.fn();
    const wired = deps({
      persistSync: async () => {
        throw new Error("sync write failed");
      },
      persistArSnapshot,
      persistApSnapshot,
    });
    await expect(
      acquireAndPersistAccountingStateWithArApSnapshots(input, wired),
    ).rejects.toThrow(/sync write failed/);
    expect(persistArSnapshot).not.toHaveBeenCalled();
    expect(persistApSnapshot).not.toHaveBeenCalled();
  });

  it("13. AR snapshot persist failure is surfaced and AP is not persisted", async () => {
    const persistApSnapshot = vi.fn();
    const wired = deps({
      persistArSnapshot: async () => {
        throw new Error("ar snapshot write failed");
      },
      persistApSnapshot,
    });
    await expect(
      acquireAndPersistAccountingStateWithArApSnapshots(input, wired),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AR_SNAPSHOT_PERSIST_FAILED,
    });
    expect(persistApSnapshot).not.toHaveBeenCalled();
  });

  it("14. AP snapshot persist failure is partial and does not claim AP authority", async () => {
    const wired = deps({
      persistApSnapshot: async () => {
        throw new Error("ap snapshot write failed");
      },
    });
    try {
      await acquireAndPersistAccountingStateWithArApSnapshots(input, wired);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(CombinedAcquisitionPartialError);
      const err = e as CombinedAcquisitionPartialError;
      expect(err.code).toBe(MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AP_SNAPSHOT_PERSIST_FAILED);
      expect(err.accountingSyncId).toBe(NEW_SYNC);
      expect(err.arMeasurementSnapshot?.accountingSyncId).toBe(NEW_SYNC);
      expect(err.apMeasurementSnapshot).toBeNull();
    }
  });

  it("15. later provider AP state cannot change the frozen snapshot", async () => {
    let aging = apAgingA;
    const wired = deps({
      fetchUrmApAging: async () => aging,
    });
    const result = await acquireAndPersistAccountingStateWithArApSnapshots(input, wired);
    aging = apAgingB;
    expect(result.apMeasurementSnapshot.payload.subledgerTotalCents).toBe(8_000);
  });

  it("AR-only acquisition still does not fetch AP", async () => {
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/acquisition.ts"),
      "utf8",
    );
    const arOnly = src.slice(
      src.indexOf("export async function acquireAccountingStateForAr("),
      src.indexOf("export async function persistAcquiredAccountingStateWithArSnapshot("),
    );
    expect(arOnly).toContain("fetchUrmArReports");
    expect(arOnly).not.toContain("fetchUrmApAging");
    expect(arOnly).not.toContain("AgedPayable");
    const persistArOnly = src.slice(
      src.indexOf("export async function persistAcquiredAccountingStateWithArSnapshot("),
      src.indexOf("export async function acquireAndPersistAccountingStateWithArSnapshot("),
    );
    expect(persistArOnly).not.toContain("buildApMeasurementSnapshotFromUrmReports");
    expect(persistArOnly).not.toContain("persistApSnapshot");
    const arApAcquire = src.slice(
      src.indexOf("export async function acquireAccountingStateForArAp("),
      src.indexOf("export async function persistAcquiredAccountingStateWithArApSnapshots("),
    );
    expect(arApAcquire).not.toContain("fetchUrmInventoryValuation");
    expect(arApAcquire).not.toContain("InventoryValuation");
    const persistArAp = src.slice(
      src.indexOf("export async function persistAcquiredAccountingStateWithArApSnapshots("),
      src.indexOf("export async function acquireAndPersistAccountingStateWithArApSnapshots("),
    );
    expect(persistArAp).not.toContain("buildInventoryMeasurementSnapshotFromUrmReports");
    expect(persistArAp).not.toContain("persistInventorySnapshot");
  });
});
