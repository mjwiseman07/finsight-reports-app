import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  acquireAndPersistAccountingStateWithArApInventorySnapshots,
  type ArApInventoryAcquisitionDeps,
} from "../acquisition";
import {
  CombinedAcquisitionPartialError,
  MEASUREMENT_SNAPSHOT_ERROR,
} from "../types";
import type {
  QboApAgingResult,
  QboArAgingResult,
  QboInventoryValuationResult,
  QboTrialBalanceResult,
} from "@/lib/audit-ready/tie-out/qbo-reports";
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

const invA: QboInventoryValuationResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  items: [{ item_ref: "5", item_display_name: "Widget", qty_on_hand: 10, asset_value_cents: 4_000 }],
  total_cents: 4_000,
  raw_report_url: "https://example.invalid/inv",
  intuit_tid: "tid-inv",
};

const invB: QboInventoryValuationResult = {
  ...invA,
  items: [{ item_ref: "5", item_display_name: "Widget", qty_on_hand: 99, asset_value_cents: 99_999 }],
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
    {
      account_ref: "81",
      account_name: "Inventory",
      debit_cents: 4_000,
      credit_cents: 0,
      net_cents: 4_000,
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

function deps(over: Partial<ArApInventoryAcquisitionDeps> = {}): ArApInventoryAcquisitionDeps {
  const order: string[] = [];
  const base: ArApInventoryAcquisitionDeps = {
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
    fetchUrmInventoryValuation: async () => {
      order.push("inventory_fetch");
      return invA;
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
    persistInventorySnapshot: async (snapshot) => {
      order.push(`persist_inv:${snapshot.accountingSyncId}`);
      return { snapshot, reused: false };
    },
    generateSyncId: () => NEW_SYNC,
  };
  const merged = { ...base, ...over };
  (merged as ArApInventoryAcquisitionDeps & { order: string[] }).order = order;
  return merged;
}

describe("combined AR+AP+Inventory acquisition", () => {
  it("12-17. fetches Scorecard+AR+AP+Inventory+one TB before persist; all snapshots share the new sync", async () => {
    const wired = deps();
    const order = (wired as ArApInventoryAcquisitionDeps & { order: string[] }).order;
    const result = await acquireAndPersistAccountingStateWithArApInventorySnapshots(input, wired);
    expect(result.accountingSync.syncId).toBe(NEW_SYNC);
    expect(result.arMeasurementSnapshot.accountingSyncId).toBe(NEW_SYNC);
    expect(result.apMeasurementSnapshot.accountingSyncId).toBe(NEW_SYNC);
    expect(result.inventoryMeasurementSnapshot.accountingSyncId).toBe(NEW_SYNC);
    expect(order.filter((step) => step === "tb_fetch")).toHaveLength(1);
    const persistSyncAt = order.indexOf(`persist_sync:${NEW_SYNC}`);
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("scorecard_fetch"));
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("ar_aging_fetch"));
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("ap_aging_fetch"));
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("inventory_fetch"));
    expect(persistSyncAt).toBeGreaterThan(order.indexOf("tb_fetch"));
    expect(order.indexOf(`persist_ar:${NEW_SYNC}`)).toBeGreaterThan(persistSyncAt);
    expect(order.indexOf(`persist_ap:${NEW_SYNC}`)).toBeGreaterThan(order.indexOf(`persist_ar:${NEW_SYNC}`));
    expect(order.indexOf(`persist_inv:${NEW_SYNC}`)).toBeGreaterThan(order.indexOf(`persist_ap:${NEW_SYNC}`));
  });

  it("13. shared Trial Balance is the same frozen capture for AR, AP, and Inventory", async () => {
    const result = await acquireAndPersistAccountingStateWithArApInventorySnapshots(input, deps());
    expect(result.arMeasurementSnapshot.payload.trialBalance).toEqual(
      result.apMeasurementSnapshot.payload.trialBalance,
    );
    expect(result.inventoryMeasurementSnapshot.payload.trialBalance).toEqual(
      result.arMeasurementSnapshot.payload.trialBalance,
    );
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/acquisition.ts"),
      "utf8",
    );
    const invPersist = src.slice(
      src.indexOf("export async function persistAcquiredAccountingStateWithArApInventorySnapshots"),
    );
    expect(invPersist).toContain("const sharedTrialBalance = bundle.urmTrialBalance");
    expect(invPersist.match(/trial:\s*sharedTrialBalance/g)?.length).toBe(3);
  });

  it("18. pre-existing sync cannot authorize combined capture", async () => {
    await expect(
      acquireAndPersistAccountingStateWithArApInventorySnapshots({
        ...input,
        accountingSyncId: OLD_SYNC,
      } as never),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.PREEXISTING_SYNC_NOT_AUTHORITY,
    });
  });

  it("19. period mismatch fails closed before persist", async () => {
    const persistSync = vi.fn();
    await expect(
      acquireAndPersistAccountingStateWithArApInventorySnapshots(
        {
          ...input,
          reportPeriod: { startDate: "2026-06-01", endDate: "2026-06-30" },
        },
        deps({ persistSync }),
      ),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.SYNC_PERIOD_MISMATCH,
    });
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("20. missing BS/IS prevents sync persist", async () => {
    const persistSync = vi.fn();
    await expect(
      acquireAndPersistAccountingStateWithArApInventorySnapshots(
        input,
        deps({
          normalizeScorecard: async () => ({
            normalizedBalanceSheet: [],
            normalizedIncomeStatement: [],
          }),
          persistSync,
        }),
      ),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.CORE_STATEMENTS_MISSING,
    });
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("21. Inventory fetch failure prevents successful combined observation", async () => {
    const persistSync = vi.fn();
    await expect(
      acquireAndPersistAccountingStateWithArApInventorySnapshots(
        input,
        deps({
          fetchUrmInventoryValuation: async () => {
            throw new Error("inventory fetch failed");
          },
          persistSync,
        }),
      ),
    ).rejects.toThrow(/inventory fetch failed/);
    expect(persistSync).not.toHaveBeenCalled();
  });

  it("22. TB failure prevents all three authoritative snapshots", async () => {
    const persistArSnapshot = vi.fn();
    const persistApSnapshot = vi.fn();
    const persistInventorySnapshot = vi.fn();
    await expect(
      acquireAndPersistAccountingStateWithArApInventorySnapshots(
        input,
        deps({
          fetchUrmTrialBalance: async () => {
            throw new Error("tb failed");
          },
          persistArSnapshot,
          persistApSnapshot,
          persistInventorySnapshot,
        }),
      ),
    ).rejects.toThrow(/tb failed/);
    expect(persistArSnapshot).not.toHaveBeenCalled();
    expect(persistApSnapshot).not.toHaveBeenCalled();
    expect(persistInventorySnapshot).not.toHaveBeenCalled();
  });

  it("23. sync persist failure prevents snapshots", async () => {
    const persistArSnapshot = vi.fn();
    await expect(
      acquireAndPersistAccountingStateWithArApInventorySnapshots(
        input,
        deps({
          persistSync: async () => {
            throw new Error("sync write failed");
          },
          persistArSnapshot,
        }),
      ),
    ).rejects.toThrow(/sync write failed/);
    expect(persistArSnapshot).not.toHaveBeenCalled();
  });

  it("24. AR snapshot persist failure stops AP+Inventory", async () => {
    const persistApSnapshot = vi.fn();
    const persistInventorySnapshot = vi.fn();
    await expect(
      acquireAndPersistAccountingStateWithArApInventorySnapshots(
        input,
        deps({
          persistArSnapshot: async () => {
            throw new Error("ar snapshot write failed");
          },
          persistApSnapshot,
          persistInventorySnapshot,
        }),
      ),
    ).rejects.toMatchObject({
      code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AR_SNAPSHOT_PERSIST_FAILED,
    });
    expect(persistApSnapshot).not.toHaveBeenCalled();
    expect(persistInventorySnapshot).not.toHaveBeenCalled();
  });

  it("25. AP snapshot persist failure stops Inventory", async () => {
    const persistInventorySnapshot = vi.fn();
    try {
      await acquireAndPersistAccountingStateWithArApInventorySnapshots(
        input,
        deps({
          persistApSnapshot: async () => {
            throw new Error("ap snapshot write failed");
          },
          persistInventorySnapshot,
        }),
      );
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(CombinedAcquisitionPartialError);
      const err = e as CombinedAcquisitionPartialError;
      expect(err.code).toBe(MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AP_SNAPSHOT_PERSIST_FAILED);
      expect(err.arMeasurementSnapshot?.accountingSyncId).toBe(NEW_SYNC);
      expect(err.apMeasurementSnapshot).toBeNull();
      expect(err.inventoryMeasurementSnapshot).toBeNull();
    }
    expect(persistInventorySnapshot).not.toHaveBeenCalled();
  });

  it("26. Inventory snapshot persist failure returns explicit partial state", async () => {
    try {
      await acquireAndPersistAccountingStateWithArApInventorySnapshots(
        input,
        deps({
          persistInventorySnapshot: async () => {
            throw new Error("inventory snapshot write failed");
          },
        }),
      );
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(CombinedAcquisitionPartialError);
      const err = e as CombinedAcquisitionPartialError;
      expect(err.code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.COMBINED_INVENTORY_SNAPSHOT_PERSIST_FAILED,
      );
      expect(err.arMeasurementSnapshot?.accountingSyncId).toBe(NEW_SYNC);
      expect(err.apMeasurementSnapshot?.accountingSyncId).toBe(NEW_SYNC);
      expect(err.inventoryMeasurementSnapshot).toBeNull();
    }
  });

  it("27. later provider Inventory state cannot change the frozen snapshot", async () => {
    let valuation = invA;
    const result = await acquireAndPersistAccountingStateWithArApInventorySnapshots(
      input,
      deps({
        fetchUrmInventoryValuation: async () => valuation,
      }),
    );
    valuation = invB;
    expect(result.inventoryMeasurementSnapshot.payload.subledgerTotalCents).toBe(4_000);
  });
});
