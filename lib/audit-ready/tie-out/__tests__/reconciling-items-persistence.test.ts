import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_RECON_OUTCOME_POLICY } from "@/lib/audit-ready/tie-out/recon-model";

const MIGRATION =
  "supabase/migrations/20260815000000_urm2_reconciling_items_persistence.sql";

type Row = Record<string, unknown>;

const state = {
  runs: {} as Record<string, Row>,
  items: [] as Row[],
  lastInsert: null as Row[] | null,
  lastRunUpdate: null as Row | null,
  deletedRunIds: [] as string[],
};

function makeChain(table: string) {
  const filters: Array<[string, unknown]> = [];
  let pendingInsert: Row[] | null = null;
  let pendingUpdate: Row | null = null;
  let orderCol: string | null = null;

  const chain: Record<string, unknown> = {
    select(_cols?: string) {
      return chain;
    },
    insert(rows: Row | Row[]) {
      pendingInsert = Array.isArray(rows) ? rows : [rows];
      return chain;
    },
    update(payload: Row) {
      pendingUpdate = payload;
      return chain;
    },
    delete() {
      return chain;
    },
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      return chain;
    },
    order(col: string) {
      orderCol = col;
      return chain;
    },
    async maybeSingle() {
      if (table === "audit_ready_tie_out_runs") {
        const id = filters.find((f) => f[0] === "id")?.[1];
        if (pendingUpdate && id != null) {
          const existing = state.runs[String(id)];
          if (!existing) return { data: null, error: { message: "missing" } };
          state.runs[String(id)] = { ...existing, ...pendingUpdate };
          state.lastRunUpdate = pendingUpdate;
          pendingUpdate = null;
          return { data: state.runs[String(id)], error: null };
        }
        return {
          data: id != null ? (state.runs[String(id)] ?? null) : null,
          error: null,
        };
      }
      return { data: null, error: null };
    },
    then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
      // Thenable for await supabase.from(...).delete().eq(...)
      // and await supabase.from(...).update(...).eq(...)
      // and await supabase.from(...).insert(...).select(...)
      try {
        if (table === "audit_ready_reconciling_items") {
          if (pendingInsert) {
            const inserted = pendingInsert.map((r, i) => ({
              id: `item-${state.items.length + i + 1}`,
              created_at: "2026-08-14T00:00:00Z",
              ...r,
            }));
            state.items.push(...inserted);
            state.lastInsert = inserted;
            pendingInsert = null;
            resolve({ data: inserted.map((r) => ({ id: r.id })), error: null });
            return;
          }
          const runId = filters.find((f) => f[0] === "run_id")?.[1];
          // delete path: no pendingInsert/update, has eq run_id
          if (
            runId != null &&
            pendingUpdate == null &&
            !filters.some((f) => f[0] === "id")
          ) {
            // Heuristic: if select wasn't the intent — delete when no order
            // For select with order: return items
            if (orderCol) {
              const rows = state.items
                .filter((r) => r.run_id === runId)
                .sort(
                  (a, b) =>
                    Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
                );
              resolve({ data: rows, error: null });
              return;
            }
            state.deletedRunIds.push(String(runId));
            state.items = state.items.filter((r) => r.run_id !== runId);
            resolve({ data: null, error: null });
            return;
          }
        }
        if (table === "audit_ready_tie_out_runs" && pendingUpdate) {
          const id = filters.find((f) => f[0] === "id")?.[1];
          if (id != null && state.runs[String(id)]) {
            state.runs[String(id)] = {
              ...state.runs[String(id)],
              ...pendingUpdate,
            };
            state.lastRunUpdate = pendingUpdate;
          }
          pendingUpdate = null;
          resolve({ data: null, error: null });
          return;
        }
        resolve({ data: null, error: null });
      } catch (e) {
        reject?.(e);
      }
    },
  };
  return chain;
}

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

import {
  clearReconBridgeForRun,
  loadReconBridgeForRun,
  persistReconBridgeForRun,
  replaceReconcilingItemsForRun,
} from "../reconciling-items-persistence";

const permissivePolicy = {
  allowTimingReconciled: true,
  immaterialResidualMaxDollar: 1,
  immaterialResidualMaxPercent: 0.05,
  immaterialComparison: "tighter_of_both" as const,
};

describe("URM-2 migration (static)", () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");

  it("creates audit_ready_reconciling_items with identified-only classes", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.audit_ready_reconciling_items");
    expect(sql).toContain("'identified_timing'");
    expect(sql).toContain("'identified_documented'");
    expect(sql).toContain("'identified_reclass'");
    expect(sql).toContain("'identified_error'");
    expect(sql).not.toMatch(
      /item_class[\s\S]{0,200}unidentified_residual/,
    );
  });

  it("adds run-level URM columns including baseline_sync_id", () => {
    expect(sql).toContain("identified_items_total_cents");
    expect(sql).toContain("unidentified_residual_cents");
    expect(sql).toContain("recon_outcome");
    expect(sql).toContain("baseline_sync_id");
    expect(sql).toContain("REFERENCES public.accounting_syncs(id)");
  });

  it("uses engagement-scoped SELECT RLS + service_role writes", () => {
    expect(sql).toContain("ar_reconciling_items_service_role_all");
    expect(sql).toContain("ar_reconciling_items_engagement_read");
    expect(sql).toContain("FOR SELECT TO authenticated");
    expect(sql).toContain("FOR ALL TO service_role");
  });
});

describe("URM-2 persistence helpers", () => {
  beforeEach(() => {
    state.runs = {
      "run-1": {
        id: "run-1",
        engagement_id: "eng-1",
        pbc_request_id: "pbc-1",
        totals_variance_cents: 25_000,
        baseline_sync_id: null,
      },
    };
    state.items = [];
    state.lastInsert = null;
    state.lastRunUpdate = null;
    state.deletedRunIds = [];
  });

  it("rejects unidentified_residual as a persistable item", async () => {
    await expect(
      replaceReconcilingItemsForRun({
        runId: "run-1",
        engagementId: "eng-1",
        pbcRequestId: "pbc-1",
        items: [
          {
            itemClass: "unidentified_residual" as never,
            amountCents: 100,
            clearancePolicy: "requires_resolution",
            status: "kickout",
          },
        ],
      }),
    ).rejects.toThrow("urm2_unidentified_residual_not_persistable");
  });

  it("fails closed when run totals_variance_cents is missing", async () => {
    state.runs["run-1"].totals_variance_cents = null;
    await expect(
      persistReconBridgeForRun({
        runId: "run-1",
        items: [],
        policy: DEFAULT_RECON_OUTCOME_POLICY,
      }),
    ).rejects.toThrow("urm2_gross_variance_authority_missing");
  });

  it("persists bridge using totals_variance_cents as gross authority", async () => {
    const result = await persistReconBridgeForRun({
      runId: "run-1",
      items: [
        {
          itemClass: "identified_timing",
          amountCents: 25_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        },
      ],
      policy: permissivePolicy,
      baselineSyncId: "sync-abc",
    });

    expect(result.grossVarianceCents).toBe(25_000);
    expect(result.bridge.unidentifiedResidualCents).toBe(0);
    expect(result.bridge.reconOutcome).toBe("reconciled_with_timing");
    expect(result.baselineSyncId).toBe("sync-abc");
    expect(state.lastRunUpdate?.recon_outcome).toBe("reconciled_with_timing");
    expect(state.lastRunUpdate?.identified_items_total_cents).toBe(25_000);
    expect(state.lastRunUpdate?.unidentified_residual_cents).toBe(0);
    expect(state.lastRunUpdate?.baseline_sync_id).toBe("sync-abc");
    expect(state.items).toHaveLength(1);
    expect(state.items[0].item_class).toBe("identified_timing");
  });

  it("default fail-closed policy does not clear 1-cent residual", async () => {
    state.runs["run-1"].totals_variance_cents = 10_001;
    const result = await persistReconBridgeForRun({
      runId: "run-1",
      items: [
        {
          itemClass: "identified_documented",
          amountCents: 10_000,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        },
      ],
      policy: DEFAULT_RECON_OUTCOME_POLICY,
    });
    expect(result.bridge.unidentifiedResidualCents).toBe(1);
    expect(result.bridge.reconOutcome).toBe("open_material");
  });

  it("replace is idempotent (delete then insert)", async () => {
    await persistReconBridgeForRun({
      runId: "run-1",
      items: [
        {
          itemClass: "identified_documented",
          amountCents: 10_000,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        },
      ],
      policy: permissivePolicy,
    });
    expect(state.deletedRunIds).toContain("run-1");
    expect(state.items).toHaveLength(1);

    await persistReconBridgeForRun({
      runId: "run-1",
      items: [
        {
          itemClass: "identified_documented",
          amountCents: 20_000,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        },
        {
          itemClass: "identified_timing",
          amountCents: 5_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        },
      ],
      policy: permissivePolicy,
    });
    expect(state.items).toHaveLength(2);
    expect(state.items.map((i) => i.amount_cents)).toEqual([20_000, 5_000]);
  });

  it("loadReconBridgeForRun returns stored columns + items", async () => {
    await persistReconBridgeForRun({
      runId: "run-1",
      items: [
        {
          itemClass: "identified_documented",
          amountCents: 25_000,
          clearancePolicy: "immaterial_ok",
          status: "tie",
          evidenceIds: ["11111111-1111-1111-1111-111111111111"],
        },
      ],
      policy: permissivePolicy,
    });

    const loaded = await loadReconBridgeForRun("run-1");
    expect(loaded.grossVarianceCents).toBe(25_000);
    expect(loaded.reconOutcome).toBe("reconciled_exact");
    expect(loaded.unidentifiedResidualCents).toBe(0);
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0].evidence_ids).toEqual([
      "11111111-1111-1111-1111-111111111111",
    ]);
  });

  it("clearReconBridgeForRun removes items and nulls URM columns", async () => {
    await persistReconBridgeForRun({
      runId: "run-1",
      items: [
        {
          itemClass: "identified_documented",
          amountCents: 25_000,
          clearancePolicy: "immaterial_ok",
          status: "tie",
        },
      ],
      policy: permissivePolicy,
      baselineSyncId: "sync-keep",
    });
    await clearReconBridgeForRun("run-1");
    expect(state.items).toHaveLength(0);
    expect(state.runs["run-1"].recon_outcome).toBeNull();
    expect(state.runs["run-1"].urm_bridge_persisted_at).toBeNull();
    // baseline pin retained on clear (custody pin is independent of bridge rows)
    expect(state.runs["run-1"].baseline_sync_id).toBe("sync-keep");
  });

  it("material residual remains open_material", async () => {
    const result = await persistReconBridgeForRun({
      runId: "run-1",
      items: [
        {
          itemClass: "identified_timing",
          amountCents: 1_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        },
      ],
      policy: permissivePolicy,
    });
    expect(result.bridge.unidentifiedResidualCents).toBe(24_000);
    expect(result.bridge.reconOutcome).toBe("open_material");
  });
});
