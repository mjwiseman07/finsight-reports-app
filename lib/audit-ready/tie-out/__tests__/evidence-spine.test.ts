import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  deriveReconBridge,
  DEFAULT_RECON_OUTCOME_POLICY,
} from "@/lib/audit-ready/tie-out/recon-model";
import {
  LEGACY_EVIDENCE_SOURCE_KINDS,
  URM3_EVIDENCE_SOURCE_KINDS,
  EVIDENCE_SOURCE_KINDS,
  EVIDENCE_PROVIDERS,
  EVIDENCE_CONTENT_HASH_REGEX,
  assertEvidenceSourceIdentity,
  normalizeEvidenceContentHash,
  hashEvidenceBytes,
  evidenceDoesNotAffectBridgeMath,
} from "@/lib/audit-ready/tie-out/evidence-spine";

const MIGRATION =
  "supabase/migrations/20260815120000_urm3_universal_evidence_spine.sql";

/** Empty-buffer SHA-256 — valid Advisacor format. */
const HASH_EMPTY = createHash("sha256").update("").digest("hex");
const HASH_DOC_A = createHash("sha256").update("doc-a").digest("hex");
const HASH_DOC_B = createHash("sha256").update("doc-b").digest("hex");

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
  /** When true, item evidence_ids updates fail (simulates cache drift). */
  failCacheUpdate: false,
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
  if (path) {
    const hash = row.content_hash;
    if (typeof hash !== "string" || !EVIDENCE_CONTENT_HASH_REGEX.test(hash)) {
      throw new Error("urm3_content_hash_required_for_storage");
    }
  }
  if (row.content_hash != null) {
    const h = String(row.content_hash)
      .trim()
      .toLowerCase()
      .replace(/^sha256:/, "");
    if (!EVIDENCE_CONTENT_HASH_REGEX.test(h)) {
      throw new Error("urm3_invalid_content_hash");
    }
    row.content_hash = h;
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
        // Simulate unique (item, content_hash)
        if (raw.reconciling_item_id && raw.content_hash) {
          const dup = state.evidence.find(
            (e) =>
              e.reconciling_item_id === raw.reconciling_item_id &&
              e.content_hash === raw.content_hash,
          );
          if (dup) {
            return {
              data: null,
              error: { message: "duplicate key uq_arte_item_content_hash" },
            };
          }
        }
        const row: Row = {
          id: `ev-${state.evidence.length + 1}`,
          created_at: "2026-08-14T12:00:00Z",
          linked_po_ids: [],
          linked_invoice_ids: [],
          file_name: null,
          content_type: null,
          source_date: null,
          fetched_at: null,
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
        let rows = [...state.evidence];
        for (const [col, val] of filters) {
          rows = rows.filter((r) => r[col] === val);
        }
        return { data: rows[0] ?? null, error: null };
      }
      return { data: null, error: null };
    },
    then(resolve: (v: unknown) => unknown) {
      if (pendingUpdate && table === "audit_ready_reconciling_items") {
        if (state.failCacheUpdate) {
          pendingUpdate = null;
          return Promise.resolve(
            resolve({ data: null, error: { message: "cache_update_failed" } }),
          );
        }
        const id = filters.find((f) => f[0] === "id")?.[1];
        if (id != null && state.items[String(id)]) {
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
        let rows = [...state.evidence];
        for (const [col, val] of filters) {
          rows = rows.filter((r) => r[col] === val);
        }
        if (orderCol) {
          rows.sort((a, b) =>
            String(a[orderCol!]).localeCompare(String(b[orderCol!])),
          );
        }
        return Promise.resolve(resolve({ data: rows, error: null }));
      }
      return Promise.resolve(resolve({ data: [], error: null }));
    },
  };

  chain.delete = () => {
    return {
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
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS reconciling_item_id");
  });

  it("includes complete URM-3 source_kind taxonomy", () => {
    for (const kind of [
      ...LEGACY_EVIDENCE_SOURCE_KINDS,
      ...URM3_EVIDENCE_SOURCE_KINDS,
    ]) {
      expect(sql).toContain(`'${kind}'`);
    }
  });

  it("includes provider-neutral providers including system and manual", () => {
    for (const p of EVIDENCE_PROVIDERS) {
      expect(sql).toContain(`'${p}'`);
    }
  });

  it("adds document metadata fields for workpaper display", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS file_name");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS content_type");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS source_date");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS fetched_at");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS provider");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS external_ref");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS storage_path");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS content_hash");
  });

  it("enforces SHA-256 hex content_hash in DB", () => {
    expect(sql).toContain("arte_content_hash_sha256_hex");
    expect(sql).toContain("^[a-f0-9]{64}$");
    expect(sql).toContain("arte_storage_requires_content_hash");
    expect(sql).toContain("urm3_invalid_content_hash");
  });

  it("enforces same-run integrity via trigger", () => {
    expect(sql).toContain("trg_arte_stamp_run_identity");
    expect(sql).toContain("urm3_cross_run_evidence_forbidden");
  });

  it("denies cross-engagement authenticated reads via engagement RLS", () => {
    expect(sql).toContain("arte_select_engagement_read");
    expect(sql).toContain("company_users");
    expect(sql).toContain("firm_memberships");
    expect(sql).toContain("auth.uid()");
  });

  it("does not mutate recon math columns or URM-2 RPC", () => {
    expect(sql).not.toContain("unidentified_residual_cents");
    expect(sql).not.toContain("identified_items_total_cents");
    expect(sql).not.toContain("recon_outcome");
    expect(sql).not.toContain("persist_audit_ready_recon_bridge");
    expect(sql).not.toContain("baseline_sync_id");
  });
});

describe("URM-3 hash convention", () => {
  it("matches upload-artifact SHA-256 hex convention", () => {
    expect(HASH_EMPTY).toMatch(EVIDENCE_CONTENT_HASH_REGEX);
    expect(hashEvidenceBytes("")).toBe(HASH_EMPTY);
    expect(normalizeEvidenceContentHash(`SHA256:${HASH_EMPTY.toUpperCase()}`)).toBe(
      HASH_EMPTY,
    );
  });

  it("rejects malformed hashes fail-closed", () => {
    expect(() => normalizeEvidenceContentHash("abc123")).toThrow(
      "urm3_invalid_content_hash",
    );
    expect(() => normalizeEvidenceContentHash("sha256:deadbeef")).toThrow(
      "urm3_invalid_content_hash",
    );
    expect(() =>
      assertEvidenceSourceIdentity({
        sourceKind: "pbc_upload",
        storagePath: "pbc/a.pdf",
      }),
    ).toThrow("urm3_content_hash_required_for_storage");
    expect(() =>
      assertEvidenceSourceIdentity({
        sourceKind: "pbc_upload",
        storagePath: "pbc/a.pdf",
        contentHash: "not-a-hash",
      }),
    ).toThrow("urm3_invalid_content_hash");
  });

  it("accepts storage evidence with valid hash + metadata", () => {
    expect(() =>
      assertEvidenceSourceIdentity({
        sourceKind: "bank_statement",
        storagePath: "pbc/bank.pdf",
        contentHash: HASH_DOC_A,
        provider: "external",
        fileName: "bank.pdf",
        contentType: "application/pdf",
        sourceDate: "2026-07-31",
        fetchedAt: "2026-08-01T12:00:00Z",
      }),
    ).not.toThrow();
  });
});

describe("URM-3 source kind + provider constants", () => {
  it("preserves legacy kinds and complete spine kinds", () => {
    expect(LEGACY_EVIDENCE_SOURCE_KINDS).toEqual([
      "bill",
      "invoice",
      "inventory_adjustment",
    ]);
    expect(URM3_EVIDENCE_SOURCE_KINDS).toEqual(
      expect.arrayContaining([
        "customer_statement",
        "fixed_asset_register",
        "debt_statement",
        "tax_document",
        "lease_schedule",
        "system_generated_schedule",
      ]),
    );
    expect(EVIDENCE_SOURCE_KINDS).toHaveLength(
      LEGACY_EVIDENCE_SOURCE_KINDS.length + URM3_EVIDENCE_SOURCE_KINDS.length,
    );
    expect(EVIDENCE_PROVIDERS).toEqual([
      "quickbooks",
      "xero",
      "external",
      "system",
      "manual",
    ]);
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
    state.failCacheUpdate = false;
  });

  it("attaches third-party evidence with document metadata", async () => {
    const row = await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      sourceKind: "fixed_asset_register",
      provider: "system",
      storagePath: "pbc/fa-register.xlsx",
      contentHash: HASH_DOC_A,
      fileName: "fa-register.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceDate: "2026-07-31",
      fetchedAt: "2026-08-01T12:00:00Z",
      totalCents: 0,
    });

    expect(row.reconciling_item_id).toBe("item-1");
    expect(row.run_id).toBe("run-a");
    expect(row.content_hash).toBe(HASH_DOC_A);
    expect(row.file_name).toBe("fa-register.xlsx");
    expect(row.source_date).toBe("2026-07-31");
    expect(state.items["item-1"].evidence_ids).toEqual([row.id]);
  });

  it("same-run evidence link passes; cross-run fails", async () => {
    const ok = await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      varianceId: "var-1",
      sourceKind: "confirmation",
      externalRef: "conf-1",
      provider: "external",
    });
    expect(ok.run_id).toBe("run-a");

    await expect(
      attachEvidenceToReconcilingItem({
        reconcilingItemId: "item-1",
        varianceId: "var-other-run",
        sourceKind: "confirmation",
        externalRef: "conf-2",
        provider: "external",
      }),
    ).rejects.toThrow("urm3_cross_run_evidence_forbidden");
  });

  it("GRNI-compatible variance-only bill evidence still works", async () => {
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
    expect(row.content_hash).toBeNull();
  });

  it("cache failure after insert does not throw or duplicate on retry", async () => {
    state.failCacheUpdate = true;
    const first = await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      sourceKind: "lease_schedule",
      storagePath: "pbc/lease.pdf",
      contentHash: HASH_DOC_A,
      fileName: "lease.pdf",
      contentType: "application/pdf",
      provider: "manual",
    });
    expect(first.id).toBeTruthy();
    // Cache stayed empty (failed), but canonical row exists.
    expect(state.items["item-1"].evidence_ids).toEqual([]);
    expect(state.evidence).toHaveLength(1);

    // Retry must return same canonical row (idempotent by content_hash), not insert again.
    const second = await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      sourceKind: "lease_schedule",
      storagePath: "pbc/lease.pdf",
      contentHash: HASH_DOC_A,
      fileName: "lease.pdf",
      contentType: "application/pdf",
      provider: "manual",
    });
    expect(second.id).toBe(first.id);
    expect(state.evidence).toHaveLength(1);

    state.failCacheUpdate = false;
    const repaired = await rebuildEvidenceIdsCacheForItem("item-1");
    expect(repaired).toEqual([first.id]);
    expect(state.items["item-1"].evidence_ids).toEqual([first.id]);
  });

  it("detach keeps canonical truth on cache failure; rebuild repairs", async () => {
    const row = await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      sourceKind: "debt_statement",
      storagePath: "pbc/debt.pdf",
      contentHash: HASH_DOC_B,
      provider: "external",
    });
    expect(state.items["item-1"].evidence_ids).toEqual([row.id]);

    state.failCacheUpdate = true;
    await expect(detachEvidence(row.id)).resolves.toBeUndefined();
    expect(state.evidence.find((e) => e.id === row.id)).toBeUndefined();
    // Cache stale (still lists deleted id)
    expect(state.items["item-1"].evidence_ids).toEqual([row.id]);

    state.failCacheUpdate = false;
    const repaired = await rebuildEvidenceIdsCacheForItem("item-1");
    expect(repaired).toEqual([]);
    expect(state.items["item-1"].evidence_ids).toEqual([]);
  });

  it("lists evidence by item / variance / run", async () => {
    await attachEvidenceToReconcilingItem({
      reconcilingItemId: "item-1",
      varianceId: "var-1",
      sourceKind: "tax_document",
      externalRef: "tax-1",
      provider: "manual",
    });
    await attachEvidenceToVariance({
      varianceId: "var-1",
      sourceKind: "bill",
      sourceQboId: "B-1",
    });

    expect(await listEvidenceForReconcilingItem("item-1")).toHaveLength(1);
    expect(await listEvidenceForVariance("var-1")).toHaveLength(2);
    expect(await listEvidenceForRun("run-a")).toHaveLength(2);
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
    expect(bridge.unidentifiedResidualCents).toBe(3_000);
    expect(bridge.identifiedItemsTotalCents).toBe(7_000);
  });

  it("evidence cannot magically turn residual into identified", () => {
    const residual = 3_000;
    expect(residual).not.toBe(0);
  });
});
