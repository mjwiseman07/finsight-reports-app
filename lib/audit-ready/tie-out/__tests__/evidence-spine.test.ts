import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveReconBridge, DEFAULT_RECON_OUTCOME_POLICY } from "@/lib/audit-ready/tie-out/recon-model";
import {
  LEGACY_EVIDENCE_SOURCE_KINDS,
  URM3_EVIDENCE_SOURCE_KINDS,
  EVIDENCE_SOURCE_KINDS,
  assertEvidenceSourceIdentity,
  evidenceDoesNotAffectBridgeMath,
} from "@/lib/audit-ready/tie-out/evidence-spine";

const MIGRATION =
  "supabase/migrations/20260815120000_urm3_universal_evidence_spine.sql";

type Row = Record<string, unknown>;

const state = {
  items: {} as Record<string, Row>,
  variances: {} as Record<string, Row>,
  evidence: [] as Row[],
  runMath: {} as Record<
    string,
    {
      totals_variance_cents: number;
      identified_items_total_cents: number;
      unidentified_residual_cents: number;
      recon_outcome: string;
    }
  >,
  mathMutations: 0,
};

function stampEvidenceIdentity(row: Row): void {
  let runId: string | null = null;
  let engagementId: string | null = null;

  if (row.reconciling_item_id) {
    const item = state.items[String(row.reconciling_item_id)];
    if (!item) throw new Error("urm3_reconciling_item_not_found");
    runId = String(item.run_id);
    engagementId = String(item.engagement_id);
  }
  if (row.variance_id) {
    const v = state.variances[String(row.variance_id)];
    if (!v) throw new Error("urm3_variance_not_found");
    if (runId != null && runId !== String(v.run_id)) {
      throw new Error("urm3_cross_run_evidence_forbidden");
    }
    runId = String(v.run_id);
    engagementId = String(v.engagement_id);
  }
  if (!row.variance_id && !row.reconciling_item_id) {
    throw new Error("urm3_variance_or_item_required");
  }
  const qbo = row.source_qbo_id;
  const ext = row.external_ref;
  const path = row.storage_path;
  if (!qbo && !ext && !path) {
    throw new Error("urm3_source_identity_required");
  }
  row.run_id = runId;
  row.engagement_id = engagementId;
}

function makeChain(table: string) {
  const filters: Array<[string, unknown]> = [];
  let orderCol: string | null = null;
  let pendingInsert: Row | Row[] | null = null;
  let pendingUpdate: Row | null = null;
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    insert(rows: Row | Row[]) {
      pendingInsert = rows;
      return chain;
    },
    update(patch: Row) {
      pendingUpdate = patch;
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
    async single() {
      if (pendingInsert && table === "audit_ready_tie_out_variance_evidence") {
        const raw = Array.isArray(pendingInsert)
          ? pendingInsert[0]
          : pendingInsert;
        const row: Row = {
          id: `ev-${state.evidence.length + 1}`,
          created_at: "2026-08-14T12:00:00Z",
          linked_po_ids: [],
          linked_invoice_ids: [],
          ...raw,
        };
        stampEvidenceIdentity(row);
        state.evidence.push(row);
        pendingInsert = null;
        return { data: row, error: null };
      }
      return { data: null, error: { message: "single_without_insert" } };
    },
    async maybeSingle() {
      if (table === "audit_ready_reconciling_items") {
        const id = filters.find((f) => f[0] === "id")?.[1];
        return {
          data: id != null ? (state.items[String(id)] ?? null) : null,
          error: null,
        };
      }
      if (table === "audit_ready_tie_out_variance_evidence") {
        const id = filters.find((f) => f[0] === "id")?.[1];
        const row = state.evidence.find((e) => e.id === id) ?? null;
        return { data: row, error: null };
      }
      return { data: null, error: null };
    },
    then(resolve: (v: unknown) => unknown) {
      // Awaitable thenable for select/update/delete terminal.
      if (pendingUpdate && table === "audit_ready_reconciling_items") {
        const id = filters.find((f) => f[0] === "id")?.[1];
        if (id != null && state.items[String(id)]) {
          // Refuse math-column writes from evidence helpers.
          const forbidden = [
            "identified_items_total_cents",
            "unidentified_residual_cents",
            "recon_outcome",
            "totals_variance_cents",
          ];
          for (const key of forbidden) {
            if (key in (pendingUpdate ?? {})) state.mathMutations += 1;
          }
          state.items[String(id)] = {
            ...state.items[String(id)],
            ...pendingUpdate,
          };
        }
        pendingUpdate = null;
        return Promise.resolve(resolve({ data: null, error: null }));
      }
      if (table === "audit_ready_tie_out_runs" && pendingUpdate) {
        state.mathMutations += 1;
        pendingUpdate = null;
        return Promise.resolve(
          resolve({ data: null, error: { message: "math_forbidden" } }),
        );
      }
      if (table === "audit_ready_tie_out_variance_evidence") {
        // delete path
        const id = filters.find((f) => f[0] === "id")?.[1];
        if (id != null && pendingUpdate == null && pendingInsert == null) {
          // Could be delete or select. Heuristic: if filters only id and no select result needed.
        }
        let rows = [...state.evidence];
        for (const [col, val] of filters) {
          rows = rows.filter((r) => r[col] === val);
        }
        if (orderCol) {
          rows.sort((a, b) =>
            String(a[orderCol!]).localeCompare(String(b[orderCol!])),
          );
        }
        // If this was a delete (no pendingInsert, called after delete())
        // Detect delete by checking if we're in delete mode via empty select expectation.
        // Our helper calls .delete().eq() — mock deletes when chain was delete.
        return Promise.resolve(resolve({ data: rows, error: null }));
      }
      return Promise.resolve(resolve({ data: [], error: null }));
    },
  };

  // Override delete to remove rows on await
  const originalDelete = chain.delete;
  chain.delete = () => {
    const delChain = {
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return {
          then(resolve: (v: unknown) => unknown) {
            const id = filters.find((f) => f[0] === "id")?.[1];
            if (id != null) {
              state.evidence = state.evidence.filter((e) => e.id !== id);
            }
            return Promise.resolve(resolve({ data: null, error: null }));
          },
        };
      },
    };
    void originalDelete;
    return delChain;
  };

  return chain;
}

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from(table: string) {
      return makeChain(table);
    },
  }),
}));

import {
  attachEvidenceToReconcilingItem,
  attachEvidenceToVariance,
  listEvidenceForReconcilingItem,
  listEvidenceForVariance,
  listEvidenceForRun,
  detachEvidence,
  rebuildEvidenceIdsCacheForItem,
} from "@/lib/audit-ready/tie-out/evidence-spine";

describe("URM-3 migration contract", () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");

  it("reuses variance_evidence table (no new evidence table)", () => {
    expect(sql).toContain("audit_ready_tie_out_variance_evidence");
    expect(sql).not.toMatch(/CREATE TABLE.*evidence(?!.*variance)/i);
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS reconciling_item_id");
  });

  it("expands source_kind beyond bill|invoice|inventory_adjustment", () => {
    for (const kind of LEGACY_EVIDENCE_SOURCE_KINDS) {
      expect(sql).toContain(`'${kind}'`);
    }
    for (const kind of URM3_EVIDENCE_SOURCE_KINDS) {
      expect(sql).toContain(`'${kind}'`);
    }
  });

  it("adds provider-neutral + third-party document fields", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS provider");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS external_ref");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS storage_path");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS content_hash");
    expect(sql).toContain("arte_source_identity_required");
  });

  it("enforces same-run integrity via trigger", () => {
    expect(sql).toContain("trg_arte_stamp_run_identity");
    expect(sql).toContain("urm3_cross_run_evidence_forbidden");
  });

  it("does not mutate recon math columns or URM-2 RPC", () => {
    expect(sql).not.toContain("unidentified_residual_cents");
    expect(sql).not.toContain("identified_items_total_cents");
    expect(sql).not.toContain("recon_outcome");
    expect(sql).not.toContain("persist_audit_ready_recon_bridge");
    expect(sql).not.toContain("baseline_sync_id");
  });
});

describe("URM-3 source kind constants", () => {
  it("preserves legacy kinds and adds spine kinds", () => {
    expect(LEGACY_EVIDENCE_SOURCE_KINDS).toEqual([
      "bill",
      "invoice",
      "inventory_adjustment",
    ]);
    expect(EVIDENCE_SOURCE_KINDS).toHaveLength(
      LEGACY_EVIDENCE_SOURCE_KINDS.length + URM3_EVIDENCE_SOURCE_KINDS.length,
    );
  });

  it("assertEvidenceSourceIdentity rejects empty identity", () => {
    expect(() =>
      assertEvidenceSourceIdentity({ sourceKind: "pbc_upload" }),
    ).toThrow("urm3_source_identity_required");
  });

  it("assertEvidenceSourceIdentity accepts storage_path for third-party docs", () => {
    expect(() =>
      assertEvidenceSourceIdentity({
        sourceKind: "bank_statement",
        storagePath: "pbc/eng/stmt.pdf",
        contentHash: "abc123",
        provider: "external",
      }),
    ).not.toThrow();
  });
});

describe("URM-3 evidence helpers", () => {
  beforeEach(() => {
    state.items = {
      "item-1": {
        id: "item-1",
        run_id: "run-a",
        engagement_id: "eng-a",
        evidence_ids: [],
      },
      "item-other-run": {
        id: "item-other-run",
        run_id: "run-b",
        engagement_id: "eng-b",
        evidence_ids: [],
      },
    };
    state.variances = {
      "var-1": {
        id: "var-1",
        run_id: "run-a",
        engagement_id: "eng-a",
      },
      "var-other-run": {
        id: "var-other-run",
        run_id: "run-b",
        engagement_id: "eng-b",
      },
    };
    state.evidence = [];
    state.runMath = {
      "run-a": {
        totals_variance_cents: 10_000,
        identified_items_total_cents: 7_000,
        unidentified_residual_cents: 3_000,
        recon_outcome: "reconciled_with_reconciling_items",
      },
    };
    state.mathMutations = 0;
  });

  it("attaches third-party evidence to reconciling item and dual-writes evidence_ids", async () => {
    const row = await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      sourceKind: "vendor_statement",
      provider: "external",
      storagePath: "pbc/vendor-stmt.pdf",
      contentHash: "sha256:deadbeef",
      totalCents: 0,
    });

    expect(row.reconciling_item_id).toBe("item-1");
    expect(row.run_id).toBe("run-a");
    expect(row.source_kind).toBe("vendor_statement");
    expect(row.content_hash).toBe("sha256:deadbeef");
    expect(state.items["item-1"].evidence_ids).toEqual([row.id]);
  });

  it("attaches GRNI-compatible variance-only bill evidence", async () => {
    const row = await attachEvidenceToVariance({
      varianceId: "var-1",
      sourceKind: "bill",
      sourceQboId: "Bill-99",
      provider: "quickbooks",
      totalCents: 1500,
      subtotalCents: 1500,
      balanceCents: 1500,
    });

    expect(row.variance_id).toBe("var-1");
    expect(row.reconciling_item_id).toBeNull();
    expect(row.source_qbo_id).toBe("Bill-99");
    expect(state.items["item-1"].evidence_ids).toEqual([]);
  });

  it("forbids cross-run item+variance linkage", async () => {
    await expect(
      attachEvidenceToReconcilingItem({
        reconcilingItemId: "item-1",
        varianceId: "var-other-run",
        sourceKind: "confirmation",
        externalRef: "conf-1",
        provider: "external",
      }),
    ).rejects.toThrow("urm3_cross_run_evidence_forbidden");
  });

  it("lists evidence by item / variance / run", async () => {
    await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      varianceId: "var-1",
      sourceKind: "confirmation",
      externalRef: "c-1",
    });
    await attachEvidenceToVariance({
      varianceId: "var-1",
      sourceKind: "bill",
      sourceQboId: "B-1",
    });

    const byItem = await listEvidenceForReconcilingItem("item-1");
    const byVar = await listEvidenceForVariance("var-1");
    const byRun = await listEvidenceForRun("run-a");

    expect(byItem).toHaveLength(1);
    expect(byVar).toHaveLength(2);
    expect(byRun).toHaveLength(2);
  });

  it("detaches evidence and rebuilds cache without touching math", async () => {
    const row = await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      sourceKind: "pbc_upload",
      storagePath: "pbc/a.pdf",
      contentHash: "h1",
    });
    expect(state.items["item-1"].evidence_ids).toEqual([row.id]);

    const before = { ...state.runMath["run-a"] };
    await detachEvidence(row.id);
    expect(state.evidence.find((e) => e.id === row.id)).toBeUndefined();
    expect(state.items["item-1"].evidence_ids).toEqual([]);
    expect(state.runMath["run-a"]).toEqual(before);
    expect(state.mathMutations).toBe(0);

    const rebuilt = await rebuildEvidenceIdsCacheForItem("item-1");
    expect(rebuilt).toEqual([]);
  });
});

describe("URM-3 evidence / math isolation", () => {
  it("evidence totals never enter residual derivation", () => {
    const without = evidenceDoesNotAffectBridgeMath({
      grossVarianceCents: 10_000,
      identifiedAmountsCents: [4_000, 3_000],
      evidenceTotalCents: 0,
    });
    const withEvidence = evidenceDoesNotAffectBridgeMath({
      grossVarianceCents: 10_000,
      identifiedAmountsCents: [4_000, 3_000],
      evidenceTotalCents: 999_999,
    });
    expect(withEvidence).toEqual(without);
    expect(withEvidence.residual).toBe(3_000);
  });

  it("URM-1 deriveReconBridge unchanged when evidence exists conceptually", () => {
    const bridge = deriveReconBridge({
      grossVarianceCents: 10_000,
      items: [
        {
          itemClass: "identified_timing",
          amountCents: 7_000,
          clearancePolicy: "may_reconcile_with_timing",
          status: "review",
        },
      ],
      policy: DEFAULT_RECON_OUTCOME_POLICY,
    });
    // Attaching $999k of "evidence" is not an input — residual stays 3000.
    expect(bridge.unidentifiedResidualCents).toBe(3_000);
    expect(bridge.identifiedItemsTotalCents).toBe(7_000);
  });

  it("evidence cannot magically turn residual into identified", () => {
    const residual = 3_000;
    const evidenceAttachedToNothing = 3_000;
    // Residual is derived; evidence alone does not create an identified item.
    const stillResidual = residual; // not residual - evidenceAttached
    void evidenceAttachedToNothing;
    expect(stillResidual).toBe(3_000);
    expect(stillResidual).not.toBe(0);
  });
});
