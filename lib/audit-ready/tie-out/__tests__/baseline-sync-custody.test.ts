import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BASELINE_SYNC_CUSTODY_ERROR,
  BaselineSyncCustodyError,
  SHIPPED_TIE_OUT_MEASUREMENT_SOURCE,
  SYNC_BACKED_TIE_OUT_KINDS,
  assertRunIdDistinctFromBaselineSyncId,
  baselineSyncCustodyInsertFields,
  baselineSyncInsertForMeasurement,
  isCcAuthoritativeUrmCustody,
  mayStampBaselineSyncId,
  requireAuthoritativeBaselineSyncId,
  resolvePersistedAuthoritativeAccountingSyncIdWithDeps,
  selectLatestCompletedTieOutRunFromCandidates,
  type AccountingSyncCustodyDeps,
  type CompletedTieOutRunCandidate,
} from "../baseline-sync-custody";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const SYNC_A = "11111111-1111-4111-8111-111111111111";
const SYNC_B = "22222222-2222-4222-8222-222222222222";
const CONN_CURRENT = "conn-current";
const CONN_OLD = "conn-old";

const RESOLVER_FILES = {
  ar_aging: "lib/audit-ready/tie-out/ar-resolver.ts",
  ap_aging: "lib/audit-ready/tie-out/ap-resolver.ts",
  inventory: "lib/audit-ready/tie-out/inventory-resolver.ts",
  fixed_asset_rollforward: "lib/audit-ready/tie-out/fa-rollforward-resolver.ts",
  grni: "lib/audit-ready/tie-out/grni-resolver.ts",
  bs_account_recon: "lib/audit-ready/tie-out/bs-account-resolver.ts",
  bs_recon_summary: "lib/audit-ready/tie-out/bs-summary-resolver.ts",
} as const;

const LIVE_FETCH = {
  ar_aging: ["fetchQboArAgingDetail", "fetchQboTrialBalance"],
  ap_aging: ["fetchQboApAgingDetail", "fetchQboTrialBalance"],
  inventory: ["fetchQboInventoryValuationDetail", "fetchQboTrialBalance"],
  fixed_asset_rollforward: [
    "fetchQboAccountList",
    "fetchQboGeneralLedgerDetail",
    "fetchQboTrialBalance",
  ],
  grni: ["fetchQboOpenUnbilledBills"],
  bs_account_recon: ["fetchQboGeneralLedgerDetail", "fetchQboTrialBalance"],
  bs_recon_summary: ["fetchQboBalanceSheet"],
} as const;

function row(
  id: string,
  connectionId: string,
  lastSyncedAt = "2026-08-17T11:00:00.000Z",
) {
  return {
    id,
    connection_id: connectionId,
    source_system: "quickbooks",
    validation_status: "SUCCESS",
    last_synced_at: lastSyncedAt,
  };
}

function deps(overrides: Partial<AccountingSyncCustodyDeps> = {}): AccountingSyncCustodyDeps {
  const pointerConn = {
    id: CONN_CURRENT,
    provider: "quickbooks",
    metadata_json: {
      active_normalized_sync_id: SYNC_B,
      last_sync_id: SYNC_B,
    },
  };
  return {
    selectConnection: async () => pointerConn,
    loadSuccessSync: async ({ syncId }) => {
      if (syncId === SYNC_A) return row(SYNC_A, CONN_CURRENT);
      if (syncId === SYNC_B) return row(SYNC_B, CONN_CURRENT);
      return null;
    },
    loadLatestSuccessSync: async () => row(SYNC_B, CONN_CURRENT),
    ...overrides,
  };
}

describe("CC-2A Option B: live measurement must not claim baseline_sync_id", () => {
  it("every shipped kind is live_provider today", () => {
    for (const kind of SYNC_BACKED_TIE_OUT_KINDS) {
      expect(SHIPPED_TIE_OUT_MEASUREMENT_SOURCE[kind]).toBe("live_provider");
      expect(mayStampBaselineSyncId(SHIPPED_TIE_OUT_MEASUREMENT_SOURCE[kind])).toBe(
        false,
      );
    }
  });

  it("live_provider insert omits baseline_sync_id even when a sync id is supplied", () => {
    expect(
      baselineSyncInsertForMeasurement({
        measurementSource: "live_provider",
        accountingSyncId: SYNC_A,
      }),
    ).toEqual({});
    expect(isCcAuthoritativeUrmCustody(null)).toBe(false);
    expect(isCcAuthoritativeUrmCustody("")).toBe(false);
    expect(isCcAuthoritativeUrmCustody(SYNC_A)).toBe(true);
  });

  it("persisted_sync_snapshot is the only path that may stamp, and stamps that exact id", () => {
    expect(mayStampBaselineSyncId("persisted_sync_snapshot")).toBe(true);
    expect(
      baselineSyncInsertForMeasurement({
        measurementSource: "persisted_sync_snapshot",
        accountingSyncId: SYNC_A,
      }),
    ).toEqual({ baseline_sync_id: SYNC_A });
    expect(baselineSyncCustodyInsertFields(SYNC_A).baseline_sync_id).toBe(SYNC_A);
  });

  it("no shipped resolver stamps baseline_sync_id or requires a sync before live fetch", () => {
    for (const [kind, rel] of Object.entries(RESOLVER_FILES)) {
      const src = read(rel);
      expect(src, kind).not.toContain("baselineSyncCustodyInsertFields");
      expect(src, kind).not.toContain("baselineSyncInsertForMeasurement");
      expect(src, kind).not.toContain("requireAuthoritativeBaselineSyncId");
      expect(src, kind).not.toMatch(/baseline_sync_id/);
      expect(src, kind).not.toContain("resolvePersistedAuthoritativeAccountingSyncId");
      for (const fn of LIVE_FETCH[kind as keyof typeof LIVE_FETCH]) {
        expect(src, `${kind} ${fn}`).toContain(fn);
      }
    }
  });

  it("worker/regenerate/routes do not fail-closed on missing sync or pass a stamp id", () => {
    const worker = read("lib/audit-ready/tie-out/worker.ts");
    const regenerate = read("lib/audit-ready/tie-out/regenerate-run.ts");
    const bsRoute = read(
      "app/api/audit-ready/[engagementId]/tie-out/bs-summary/run/route.ts",
    );
    const cron = read("app/api/cron/bs-recon-monthly/route.ts");
    for (const [name, src] of [
      ["worker", worker],
      ["regenerate", regenerate],
      ["bsRoute", bsRoute],
      ["cron", cron],
    ] as const) {
      expect(src, name).not.toContain("resolvePersistedAuthoritativeAccountingSyncId");
      expect(src, name).not.toContain("baselineSyncId");
    }
  });

  it("runId != baseline_sync_id contract preserved for a future snapshot stamp", () => {
    expect(() =>
      assertRunIdDistinctFromBaselineSyncId("run-1", SYNC_A),
    ).not.toThrow();
    expect(() => assertRunIdDistinctFromBaselineSyncId(SYNC_A, SYNC_A)).toThrow(
      BaselineSyncCustodyError,
    );
  });

  it("empty/metadata ids cannot claim CC-authoritative custody", () => {
    expect(() => requireAuthoritativeBaselineSyncId(null)).toThrow(
      BaselineSyncCustodyError,
    );
    expect(() => requireAuthoritativeBaselineSyncId("")).toThrow(
      BaselineSyncCustodyError,
    );
    expect(() => requireAuthoritativeBaselineSyncId("metadata:foo")).toThrow(
      BaselineSyncCustodyError,
    );
    try {
      requireAuthoritativeBaselineSyncId(null);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BaselineSyncCustodyError);
      expect((e as BaselineSyncCustodyError).code).toBe(BASELINE_SYNC_CUSTODY_ERROR);
    }
  });

  it("supplied sync A is never replaced by latest sync B", async () => {
    const latest = vi.fn(async () => row(SYNC_B, CONN_CURRENT));
    const result = await resolvePersistedAuthoritativeAccountingSyncIdWithDeps(
      {
        userId: "user-1",
        sourceSystem: "quickbooks",
        suppliedAccountingSyncId: SYNC_A,
      },
      deps({ loadLatestSuccessSync: latest }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountingSyncId).toBe(SYNC_A);
      expect(result.source).toBe("supplied");
      expect(result.lastSyncedAt).toBe("2026-08-17T11:00:00.000Z");
    }
    expect(latest).not.toHaveBeenCalled();
  });

  it("reconnect/current connection does not rewrite a supplied sync id", async () => {
    const result = await resolvePersistedAuthoritativeAccountingSyncIdWithDeps(
      {
        userId: "user-1",
        sourceSystem: "quickbooks",
        suppliedAccountingSyncId: SYNC_A,
      },
      deps({
        selectConnection: async () => ({
          id: CONN_CURRENT,
          provider: "quickbooks",
          metadata_json: { active_normalized_sync_id: SYNC_B },
        }),
        loadSuccessSync: async ({ syncId }) => {
          if (syncId === SYNC_A) return row(SYNC_A, CONN_OLD);
          if (syncId === SYNC_B) return row(SYNC_B, CONN_CURRENT);
          return null;
        },
        loadLatestSuccessSync: async () => row(SYNC_B, CONN_CURRENT),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("baseline_sync_connection_mismatch");
    }
  });

  it("historical null baseline values are not inferred or backfilled", () => {
    const persistence = read(
      "lib/audit-ready/tie-out/reconciling-items-persistence.ts",
    );
    expect(persistence).toContain("baseline_sync_id is never written here");
    const custody = read("lib/audit-ready/tie-out/baseline-sync-custody.ts");
    expect(custody).not.toMatch(/\.update\(\s*\{[^}]*baseline_sync_id/);
    expect(custody).not.toContain("UPDATE public.audit_ready_tie_out_runs");
    expect(custody).toContain("Do not stamp baseline_sync_id");
  });

  it("pointer unusable falls back to latest SUCCESS for that connection", async () => {
    const result = await resolvePersistedAuthoritativeAccountingSyncIdWithDeps(
      { userId: "user-1", sourceSystem: "quickbooks" },
      deps({
        selectConnection: async () => ({
          id: CONN_CURRENT,
          provider: "quickbooks",
          metadata_json: { active_normalized_sync_id: "missing-pointer" },
        }),
        loadSuccessSync: async () => null,
        loadLatestSuccessSync: async () =>
          row(SYNC_A, CONN_CURRENT, "2026-01-01T00:00:00.000Z"),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.accountingSyncId).toBe(SYNC_A);
      expect(result.source).toBe("latest_success");
      expect(result.lastSyncedAt).toBe("2026-01-01T00:00:00.000Z");
    }
  });
});

describe("selectLatestCompletedTieOutRun semantics (source lock)", () => {
  it("general selector: completed only, completed_at DESC", () => {
    const src = read("lib/audit-ready/tie-out/baseline-sync-custody.ts");
    expect(src).toContain('eq("status", "completed")');
    expect(src).toContain('.order("completed_at", { ascending: false })');
    expect(src).not.toMatch(/selectLatestCompletedTieOutRun[\s\S]*updated_at/);
  });

  it("CC selector with sync-A requires baseline_sync_id = sync-A", () => {
    const src = read("lib/audit-ready/tie-out/baseline-sync-custody.ts");
    expect(src).toContain("if (requiredSync)");
    expect(src).toContain('query.eq("baseline_sync_id", requiredSync)');
  });
});

describe("selectLatestCompletedTieOutRunFromCandidates (CC within custody)", () => {
  const run = (
    id: string,
    completedAt: string,
    baselineSyncId: string | null,
    status = "completed",
  ): CompletedTieOutRunCandidate => ({
    id,
    status,
    completedAt,
    baselineSyncId,
  });

  it("newest null-custody run does not hide older sync-A authoritative run", () => {
    const selected = selectLatestCompletedTieOutRunFromCandidates(
      [
        run("run-3", "2026-08-17T12:00:00.000Z", null),
        run("run-2", "2026-08-17T11:00:00.000Z", SYNC_A),
      ],
      { baselineSyncId: SYNC_A },
    );
    expect(selected?.id).toBe("run-2");
    expect(selected?.baselineSyncId).toBe(SYNC_A);
  });

  it("newest sync-B run does not hide older sync-A authoritative run", () => {
    const selected = selectLatestCompletedTieOutRunFromCandidates(
      [
        run("run-3", "2026-08-17T12:00:00.000Z", SYNC_B),
        run("run-2", "2026-08-17T11:00:00.000Z", SYNC_A),
      ],
      { baselineSyncId: SYNC_A },
    );
    expect(selected?.id).toBe("run-2");
  });

  it("no matching sync-A run returns null", () => {
    const selected = selectLatestCompletedTieOutRunFromCandidates(
      [
        run("run-3", "2026-08-17T12:00:00.000Z", null),
        run("run-2", "2026-08-17T11:00:00.000Z", SYNC_B),
      ],
      { baselineSyncId: SYNC_A },
    );
    expect(selected).toBeNull();
  });

  it("NULL baseline is never CC-authoritative", () => {
    expect(isCcAuthoritativeUrmCustody(null)).toBe(false);
    const selected = selectLatestCompletedTieOutRunFromCandidates(
      [run("run-null", "2026-08-17T12:00:00.000Z", null)],
      { baselineSyncId: SYNC_A },
    );
    expect(selected).toBeNull();
  });

  it("general selector still returns latest completed including null custody", () => {
    const selected = selectLatestCompletedTieOutRunFromCandidates([
      run("run-3", "2026-08-17T12:00:00.000Z", null),
      run("run-2", "2026-08-17T11:00:00.000Z", SYNC_A),
      run("run-failed", "2026-08-17T13:00:00.000Z", SYNC_A, "failed"),
    ]);
    expect(selected?.id).toBe("run-3");
  });
});
