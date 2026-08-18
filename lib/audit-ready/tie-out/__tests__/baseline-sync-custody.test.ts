import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BASELINE_SYNC_CUSTODY_ERROR,
  BaselineSyncCustodyError,
  assertRunIdDistinctFromBaselineSyncId,
  baselineSyncCustodyInsertFields,
  requireAuthoritativeBaselineSyncId,
  resolvePersistedAuthoritativeAccountingSyncIdWithDeps,
  type AccountingSyncCustodyDeps,
} from "../baseline-sync-custody";
import { runArResolver } from "../ar-resolver";
import { runApResolver } from "../ap-resolver";
import { runInventoryResolver } from "../inventory-resolver";
import { runFaRollforwardResolver } from "../fa-rollforward-resolver";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const SYNC_A = "11111111-1111-4111-8111-111111111111";
const SYNC_B = "22222222-2222-4222-8222-222222222222";
const CONN_CURRENT = "conn-current";
const CONN_OLD = "conn-old";

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

const policy = {
  policy_mode: "strict",
  auto_reconcile_max_dollar: 0,
  auto_reconcile_max_percent: 0,
  kickout_min_dollar: 100,
  kickout_min_percent: 5,
  authoritative_comparison: "tighter_of_both" as const,
};

describe("CC-2A baseline_sync_id custody", () => {
  it("AR authoritative run stamps supplied accountingSyncId", () => {
    expect(baselineSyncCustodyInsertFields(SYNC_A)).toEqual({
      baseline_sync_id: SYNC_A,
    });
    const src = read("lib/audit-ready/tie-out/ar-resolver.ts");
    expect(src).toContain("...baselineSyncCustodyInsertFields(baselineSyncId)");
    expect(src).toContain('tie_out_kind: "ar_aging"');
  });

  it("AP authoritative run stamps supplied accountingSyncId", () => {
    expect(baselineSyncCustodyInsertFields(SYNC_A).baseline_sync_id).toBe(SYNC_A);
    const src = read("lib/audit-ready/tie-out/ap-resolver.ts");
    expect(src).toContain("...baselineSyncCustodyInsertFields(baselineSyncId)");
    expect(src).toContain('tie_out_kind: "ap_aging"');
  });

  it("Inventory authoritative run stamps supplied accountingSyncId", () => {
    expect(baselineSyncCustodyInsertFields(SYNC_A).baseline_sync_id).toBe(SYNC_A);
    const src = read("lib/audit-ready/tie-out/inventory-resolver.ts");
    expect(src).toContain("...baselineSyncCustodyInsertFields(baselineSyncId)");
    expect(src).toContain('tie_out_kind: "inventory"');
  });

  it("FA authoritative run stamps supplied accountingSyncId", () => {
    expect(baselineSyncCustodyInsertFields(SYNC_A).baseline_sync_id).toBe(SYNC_A);
    const src = read("lib/audit-ready/tie-out/fa-rollforward-resolver.ts");
    expect(src).toContain("...baselineSyncCustodyInsertFields(baselineSyncId)");
    expect(src).toContain('tie_out_kind: "fixed_asset_rollforward"');
  });

  it("runId != baseline_sync_id contract preserved", () => {
    expect(() =>
      assertRunIdDistinctFromBaselineSyncId("run-1", SYNC_A),
    ).not.toThrow();
    expect(() => assertRunIdDistinctFromBaselineSyncId(SYNC_A, SYNC_A)).toThrow(
      BaselineSyncCustodyError,
    );
  });

  it("missing authoritative sync identity cannot complete a sync-backed run", async () => {
    expect(() => requireAuthoritativeBaselineSyncId(null)).toThrow(
      BaselineSyncCustodyError,
    );
    expect(() => requireAuthoritativeBaselineSyncId("")).toThrow(
      BaselineSyncCustodyError,
    );
    expect(() => requireAuthoritativeBaselineSyncId("metadata:foo")).toThrow(
      BaselineSyncCustodyError,
    );

    const missing = { baselineSyncId: "" } as unknown as { baselineSyncId: string };
    const common = {
      engagementId: "eng-1",
      pbcRequestId: "pbc-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-07-31",
      policy,
      triggeredByUserId: "u",
      triggerReason: "api" as const,
      ...missing,
    };
    const ar = await runArResolver({ ...common, arAccountId: "ar-1" });
    const ap = await runApResolver({ ...common, apAccountId: "ap-1" });
    const inv = await runInventoryResolver({
      ...common,
      inventoryAccountId: "inv-1",
    });
    const fa = await runFaRollforwardResolver(common);
    expect(ar.status).toBe("failed");
    expect(ap.status).toBe("failed");
    expect(inv.status).toBe("failed");
    expect(fa.status).toBe("failed");
    expect(ar.errorCode).toBe(BASELINE_SYNC_CUSTODY_ERROR);
    expect(ap.errorCode).toBe(BASELINE_SYNC_CUSTODY_ERROR);
    expect(inv.errorCode).toBe(BASELINE_SYNC_CUSTODY_ERROR);
    if (fa.status === "failed") {
      expect(fa.errorCode).toBe(BASELINE_SYNC_CUSTODY_ERROR);
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
        loadLatestSuccessSync: async () => row(SYNC_A, CONN_CURRENT, "2026-01-01T00:00:00.000Z"),
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
  it("orders completed_at DESC and requires status=completed", () => {
    const src = read("lib/audit-ready/tie-out/baseline-sync-custody.ts");
    expect(src).toContain('eq("status", "completed")');
    expect(src).toContain('.order("completed_at", { ascending: false })');
    expect(src).not.toMatch(/selectLatestCompletedTieOutRun[\s\S]*updated_at/);
  });
});
