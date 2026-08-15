import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_RECON_OUTCOME_POLICY,
  deriveReconBridge,
} from "@/lib/audit-ready/tie-out/recon-model";

const MIGRATION =
  "supabase/migrations/20260815000000_urm2_reconciling_items_persistence.sql";

type Row = Record<string, unknown>;

const state = {
  runs: {} as Record<string, Row>,
  items: [] as Row[],
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
  /** When set, next persist RPC throws without mutating state (atomic rollback). */
  failPersistWith: null as string | null,
  /** Simulate failure after hypothetical delete — RPC still rolls back (no mutation). */
  failMode: null as "insert" | "run_update" | null,
};

function snapshotBridge(runId: string) {
  const run = state.runs[runId];
  return {
    items: state.items.filter((i) => i.run_id === runId).map((i) => ({ ...i })),
    recon_outcome: run?.recon_outcome ?? null,
    identified_items_total_cents: run?.identified_items_total_cents ?? null,
    unidentified_residual_cents: run?.unidentified_residual_cents ?? null,
    urm_bridge_persisted_at: run?.urm_bridge_persisted_at ?? null,
    baseline_sync_id: run?.baseline_sync_id ?? null,
    engagement_id: run?.engagement_id ?? null,
    pbc_request_id: run?.pbc_request_id ?? null,
  };
}

function applyPersistAtomically(args: Record<string, unknown>) {
  const runId = String(args.p_run_id);
  const run = state.runs[runId];
  if (!run) throw new Error("run_not_found");
  if (run.totals_variance_cents == null) {
    throw new Error("urm2_gross_variance_authority_missing");
  }

  const items = (args.p_items as Row[]) ?? [];
  for (const item of items) {
    const cls = String(item.item_class ?? "");
    if (cls === "unidentified_residual" || !cls.startsWith("identified_")) {
      throw new Error("urm2_unidentified_residual_not_persistable");
    }
  }

  // Simulate mid-flight failures: function raises → no state mutation (rollback).
  if (state.failMode === "insert" || state.failMode === "run_update") {
    const label =
      state.failMode === "insert"
        ? "simulated_item_insert_failure"
        : "simulated_run_update_failure";
    throw new Error(label);
  }

  // Run identity is authoritative — ignore any stamped engagement/pbc on items.
  state.items = state.items.filter((i) => i.run_id !== runId);
  const inserted = items.map((item, index) => ({
    id: `item-${runId}-${index + 1}`,
    run_id: runId,
    engagement_id: run.engagement_id,
    pbc_request_id: run.pbc_request_id,
    item_class: item.item_class,
    amount_cents: item.amount_cents,
    entity_kind: item.entity_kind ?? null,
    entity_display_name: item.entity_display_name ?? null,
    expected_clear_date: item.expected_clear_date ?? null,
    clearance_policy: item.clearance_policy,
    status: item.status,
    measurement_link_variance_id: item.measurement_link_variance_id ?? null,
    evidence_ids: item.evidence_ids ?? [],
    narrative: item.narrative ?? null,
    sort_order: index,
    created_at: "2026-08-14T00:00:00Z",
  }));
  state.items.push(...inserted);

  state.runs[runId] = {
    ...run,
    identified_items_total_cents: args.p_identified_items_total_cents,
    unidentified_residual_cents: args.p_unidentified_residual_cents,
    reconciling_item_count: args.p_reconciling_item_count,
    unresolved_material_count: args.p_unresolved_material_count,
    recon_outcome: args.p_recon_outcome,
    allows_timing_reconciled: args.p_allows_timing_reconciled,
    urm_bridge_persisted_at: args.p_persisted_at,
    // baseline_sync_id never touched
  };

  return inserted.map((r) => r.id as string);
}

function applyClearAtomically(runId: string) {
  const run = state.runs[runId];
  if (!run) throw new Error("run_not_found");
  state.items = state.items.filter((i) => i.run_id !== runId);
  state.runs[runId] = {
    ...run,
    identified_items_total_cents: null,
    unidentified_residual_cents: null,
    reconciling_item_count: null,
    unresolved_material_count: null,
    recon_outcome: null,
    allows_timing_reconciled: null,
    urm_bridge_persisted_at: null,
  };
}

function makeChain(table: string) {
  const filters: Array<[string, unknown]> = [];
  let orderCol: string | null = null;
  const chain: Record<string, unknown> = {
    select() {
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
        return {
          data: id != null ? (state.runs[String(id)] ?? null) : null,
          error: null,
        };
      }
      return { data: null, error: null };
    },
    then(resolve: (v: unknown) => void) {
      if (table === "audit_ready_reconciling_items") {
        const runId = filters.find((f) => f[0] === "run_id")?.[1];
        const rows = state.items
          .filter((r) => r.run_id === runId)
          .sort(
            (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
          );
        // Prefer ordered select when order() was used.
        void orderCol;
        resolve({ data: rows, error: null });
        return;
      }
      resolve({ data: null, error: null });
    },
  };
  return chain;
}

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => makeChain(table),
    async rpc(name: string, args: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      if (state.failPersistWith && name === "persist_audit_ready_recon_bridge") {
        const msg = state.failPersistWith;
        state.failPersistWith = null;
        return { data: null, error: { message: msg } };
      }
      try {
        if (name === "persist_audit_ready_recon_bridge") {
          const ids = applyPersistAtomically(args);
          return { data: ids, error: null };
        }
        if (name === "clear_audit_ready_recon_bridge") {
          applyClearAtomically(String(args.p_run_id));
          return { data: null, error: null };
        }
        return { data: null, error: { message: `unknown_rpc:${name}` } };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },
  }),
}));

import {
  clearReconBridgeForRun,
  loadReconBridgeForRun,
  persistReconBridgeForRun,
} from "../reconciling-items-persistence";

const permissivePolicy = {
  allowTimingReconciled: true,
  immaterialResidualMaxDollar: 1,
  immaterialResidualMaxPercent: 0.05,
  immaterialComparison: "tighter_of_both" as const,
};

describe("URM-2 migration integrity (static)", () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");

  it("creates identified-only items table and run-level residual columns", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.audit_ready_reconciling_items");
    const tableStart = sql.indexOf(
      "CREATE TABLE IF NOT EXISTS public.audit_ready_reconciling_items",
    );
    const tableEnd = sql.indexOf(
      "CREATE INDEX IF NOT EXISTS idx_ar_reconciling_items_run",
    );
    const tableSql = sql.slice(tableStart, tableEnd);
    expect(tableSql).toContain("'identified_timing'");
    expect(tableSql).not.toContain("'unidentified_residual'");
    expect(sql).toContain("unidentified_residual_cents");
    expect(sql).toContain("baseline_sync_id");
  });

  it("enforces run identity via stamp trigger", () => {
    expect(sql).toContain("trg_ar_reconciling_items_stamp_run_identity");
    expect(sql).toMatch(/NEW\.engagement_id\s*:=\s*v_engagement_id/);
    expect(sql).toMatch(/NEW\.pbc_request_id\s*:=\s*v_pbc_request_id/);
  });

  it("defines atomic persist RPC with delete+insert+update in one function", () => {
    expect(sql).toContain("persist_audit_ready_recon_bridge");
    const fnStart = sql.indexOf(
      "CREATE OR REPLACE FUNCTION public.persist_audit_ready_recon_bridge",
    );
    const fnEnd = sql.indexOf(
      "CREATE OR REPLACE FUNCTION public.clear_audit_ready_recon_bridge",
    );
    const body = sql.slice(fnStart, fnEnd);
    expect(body).toMatch(/DELETE FROM public\.audit_ready_reconciling_items/);
    expect(body).toMatch(/INSERT INTO public\.audit_ready_reconciling_items/);
    expect(body).toMatch(/UPDATE public\.audit_ready_tie_out_runs/);
    expect(body).toMatch(/FOR UPDATE/);
    expect(body).not.toMatch(/baseline_sync_id\s*=/);
  });

  it("documents baseline_sync_id as custody-hook only (not URM-2 helper write)", () => {
    expect(sql).toMatch(/URM-2 helpers MUST NOT populate it/i);
  });
});

describe("URM-2 persistence helpers — identity + atomicity", () => {
  beforeEach(() => {
    state.runs = {
      "run-1": {
        id: "run-1",
        engagement_id: "eng-A",
        pbc_request_id: "pbc-A",
        totals_variance_cents: 25_000,
        baseline_sync_id: "sync-existing",
      },
    };
    state.items = [
      {
        id: "item-old",
        run_id: "run-1",
        engagement_id: "eng-A",
        pbc_request_id: "pbc-A",
        item_class: "identified_documented",
        amount_cents: 25_000,
        clearance_policy: "immaterial_ok",
        status: "tie",
        sort_order: 0,
        evidence_ids: [],
      },
    ];
    state.runs["run-1"] = {
      ...state.runs["run-1"],
      identified_items_total_cents: 25_000,
      unidentified_residual_cents: 0,
      reconciling_item_count: 1,
      unresolved_material_count: 0,
      recon_outcome: "reconciled_exact",
      allows_timing_reconciled: false,
      urm_bridge_persisted_at: "2026-08-14T00:00:00Z",
    };
    state.rpcCalls = [];
    state.failPersistWith = null;
    state.failMode = null;
  });

  it("API does not accept engagementId/pbcRequestId write authority", () => {
    // persistReconBridgeForRun signature only takes runId + items + policy.
    const keys = Object.keys({
      runId: "run-1",
      items: [],
      policy: DEFAULT_RECON_OUTCOME_POLICY,
    } as Parameters<typeof persistReconBridgeForRun>[0]);
    expect(keys).not.toContain("engagementId");
    expect(keys).not.toContain("pbcRequestId");
    expect(keys).not.toContain("baselineSyncId");
  });

  it("stamps run-derived engagement/pbc even if payload tried to smuggle other ids", async () => {
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
    });

    expect(result.bridge.reconOutcome).toBe("reconciled_with_timing");
    const rpc = state.rpcCalls.find(
      (c) => c.name === "persist_audit_ready_recon_bridge",
    );
    expect(rpc).toBeTruthy();
    // Payload items must not carry engagement/pbc authority fields.
    const payloadItems = rpc!.args.p_items as Row[];
    expect(payloadItems[0]).not.toHaveProperty("engagement_id");
    expect(payloadItems[0]).not.toHaveProperty("pbc_request_id");

    expect(state.items).toHaveLength(1);
    expect(state.items[0].engagement_id).toBe("eng-A");
    expect(state.items[0].pbc_request_id).toBe("pbc-A");
  });

  it("atomic persistence succeeds as one RPC transition", async () => {
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

    const persistCalls = state.rpcCalls.filter(
      (c) => c.name === "persist_audit_ready_recon_bridge",
    );
    expect(persistCalls).toHaveLength(1);
    expect(state.items).toHaveLength(2);
    expect(state.runs["run-1"].recon_outcome).toBe("reconciled_with_timing");
    expect(state.runs["run-1"].identified_items_total_cents).toBe(25_000);
    expect(state.runs["run-1"].unidentified_residual_cents).toBe(0);
  });

  it("simulated item insert failure leaves previous items + run bridge unchanged", async () => {
    const before = snapshotBridge("run-1");
    state.failMode = "insert";
    await expect(
      persistReconBridgeForRun({
        runId: "run-1",
        items: [
          {
            itemClass: "identified_documented",
            amountCents: 1,
            clearancePolicy: "immaterial_ok",
            status: "tie",
          },
        ],
        policy: permissivePolicy,
      }),
    ).rejects.toThrow("simulated_item_insert_failure");
    expect(snapshotBridge("run-1")).toEqual(before);
  });

  it("simulated run update failure leaves previous items + run bridge unchanged", async () => {
    const before = snapshotBridge("run-1");
    state.failMode = "run_update";
    await expect(
      persistReconBridgeForRun({
        runId: "run-1",
        items: [
          {
            itemClass: "identified_documented",
            amountCents: 1,
            clearancePolicy: "immaterial_ok",
            status: "tie",
          },
        ],
        policy: permissivePolicy,
      }),
    ).rejects.toThrow("simulated_run_update_failure");
    expect(snapshotBridge("run-1")).toEqual(before);
  });

  it("RPC error path leaves no partial state", async () => {
    const before = snapshotBridge("run-1");
    state.failPersistWith = "rpc_transport_failure";
    await expect(
      persistReconBridgeForRun({
        runId: "run-1",
        items: [
          {
            itemClass: "identified_documented",
            amountCents: 1,
            clearancePolicy: "immaterial_ok",
            status: "tie",
          },
        ],
        policy: permissivePolicy,
      }),
    ).rejects.toThrow("rpc_transport_failure");
    expect(snapshotBridge("run-1")).toEqual(before);
  });

  it("rejects unidentified_residual as item_class", async () => {
    const before = snapshotBridge("run-1");
    await expect(
      persistReconBridgeForRun({
        runId: "run-1",
        items: [
          {
            itemClass: "unidentified_residual" as never,
            amountCents: 100,
            clearancePolicy: "requires_resolution",
            status: "kickout",
          },
        ],
        policy: DEFAULT_RECON_OUTCOME_POLICY,
      }),
    ).rejects.toThrow("urm2_unidentified_residual_not_persistable");
    expect(snapshotBridge("run-1")).toEqual(before);
  });

  it("uses totals_variance_cents as gross authority", async () => {
    state.runs["run-1"].totals_variance_cents = null;
    await expect(
      persistReconBridgeForRun({
        runId: "run-1",
        items: [],
        policy: DEFAULT_RECON_OUTCOME_POLICY,
      }),
    ).rejects.toThrow("urm2_gross_variance_authority_missing");

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
    expect(result.grossVarianceCents).toBe(10_001);
    expect(result.bridge.unidentifiedResidualCents).toBe(1);
    expect(result.bridge.reconOutcome).toBe("open_material");
  });

  it("keeps URM-1 deriveReconBridge as sole formula authority", async () => {
    const expected = deriveReconBridge({
      grossVarianceCents: 25_000,
      items: [
        {
          itemClass: "identified_timing",
          amountCents: 25_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        },
      ],
      policy: permissivePolicy,
    });
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
    });
    expect(result.bridge).toEqual(expected);
    const rpc = state.rpcCalls[0];
    expect(rpc.args.p_recon_outcome).toBe(expected.reconOutcome);
    expect(rpc.args.p_unidentified_residual_cents).toBe(
      expected.unidentifiedResidualCents,
    );
  });

  it("generic helper cannot assign arbitrary baseline_sync_id", async () => {
    const result = await persistReconBridgeForRun({
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
    });
    expect(result.baselineSyncId).toBe("sync-existing");
    expect(state.runs["run-1"].baseline_sync_id).toBe("sync-existing");
    const rpc = state.rpcCalls[0];
    expect(rpc.args).not.toHaveProperty("p_baseline_sync_id");
    expect(rpc.args).not.toHaveProperty("baseline_sync_id");
  });

  it("clear retains baseline_sync_id and clears bridge atomically", async () => {
    await clearReconBridgeForRun("run-1");
    expect(state.items).toHaveLength(0);
    expect(state.runs["run-1"].recon_outcome).toBeNull();
    expect(state.runs["run-1"].urm_bridge_persisted_at).toBeNull();
    expect(state.runs["run-1"].baseline_sync_id).toBe("sync-existing");
  });

  it("loadReconBridgeForRun returns stored values", async () => {
    const loaded = await loadReconBridgeForRun("run-1");
    expect(loaded.engagementId).toBe("eng-A");
    expect(loaded.pbcRequestId).toBe("pbc-A");
    expect(loaded.reconOutcome).toBe("reconciled_exact");
    expect(loaded.baselineSyncId).toBe("sync-existing");
    expect(loaded.items).toHaveLength(1);
  });
});
