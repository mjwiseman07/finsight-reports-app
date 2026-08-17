import { describe, it, expect, vi, beforeEach } from "vitest";

const runs: Record<string, unknown> = {};
const engagements: Record<string, unknown> = {};
let variances: Record<string, unknown>[] = [];

function makeChain(table: string) {
  const filters: Array<[string, unknown]> = [];
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      return chain;
    },
    order() {
      return chain;
    },
    limit() {
      return chain;
    },
    async maybeSingle() {
      if (table === "audit_ready_engagements") {
        const id = filters.find((f) => f[0] === "id")?.[1];
        return {
          data: engagements[String(id)] ?? { engagement_name: "Test Co" },
          error: null,
        };
      }
      return { data: null, error: null };
    },
    async single() {
      if (table === "audit_ready_tie_out_runs") {
        const id = filters.find((f) => f[0] === "id")?.[1];
        const row = runs[String(id)];
        if (!row) return { data: null, error: { message: "not found" } };
        return { data: row, error: null };
      }
      return { data: null, error: { message: "not found" } };
    },
  };
  (chain as { then?: unknown }).then = (resolve: (v: unknown) => unknown) => {
    if (table === "audit_ready_tie_out_variances") {
      return Promise.resolve(resolve({ data: variances, error: null }));
    }
    return Promise.resolve(resolve({ data: [], error: null }));
  };
  return chain;
}

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

vi.mock("@/lib/audit-ready/tie-out/reconciling-items-persistence", () => ({
  loadReconBridgeForRun: vi.fn(async () => ({
    runId: "run-inv-1",
    engagementId: "eng-1",
    pbcRequestId: "pbc-1",
    grossVarianceCents: 0,
    identifiedItemsTotalCents: 0,
    unidentifiedResidualCents: 0,
    reconcilingItemCount: 0,
    unresolvedMaterialCount: 0,
    reconOutcome: null,
    allowsTimingReconciled: false,
    baselineSyncId: null,
    urmBridgePersistedAt: null,
    items: [],
  })),
}));

import { inventoryEmitter, buildInventoryPayload } from "../inventory-emitter";

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  engagements["eng-1"] = { engagement_name: "Pilot Client" };
  runs["run-inv-1"] = {
    id: "run-inv-1",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "inventory",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 1,
      kind: "inventory",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
      inventory_valuation: {
        total_cents: 75000,
        items: [
          { item_ref: "i1", item_display_name: "Widget A", qty_on_hand: 100, asset_value_cents: 80000 },
          { item_ref: "i2", item_display_name: "Widget B", qty_on_hand: -2, asset_value_cents: -5000 },
        ],
      },
      trial_balance: { lines: [] },
    },
    subledger_total_cents: 75000,
    gl_total_cents: 75000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  variances = [
    {
      entity_kind: "totals",
      entity_qbo_id: "inv-ctrl",
      entity_display_name: "Inventory valuation vs GL",
      subledger_amount_cents: 75000,
      gl_amount_cents: 75000,
      variance_cents: 0,
      variance_percent: 0,
      status: "tie",
      classification_reason: null,
    },
    {
      entity_kind: "item",
      entity_qbo_id: "i2",
      entity_display_name: "Widget B",
      subledger_amount_cents: -5000,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: "review",
      classification_reason: "negative",
    },
  ];
});

describe("inventory-emitter", () => {
  it("build() returns two_sided face + Item Detail with negative-qty flag", async () => {
    const payload = await buildInventoryPayload("run-inv-1");
    expect(payload.face.tieOutKind).toBe("inventory");
    expect(payload.face.mode).toBe("two_sided");
    expect(payload.face.leftLabel).toContain("Inventory Valuation");
    expect(payload.face.rightLabel).toContain("GL Inventory Account");
    expect(payload.backupTabs[0]!.tabName).toBe("Item Detail");
    const negRow = payload.backupTabs[0]!.rows.find((r) => r.item_ref === "i2");
    expect(String(negRow?.status)).toContain("negative");
    expect(payload.sourceData.apiResponseJson).toMatchObject({ kind: "inventory" });
  });

  it("emitXlsx() produces workbook with Cover/Face/Item Detail/Source", async () => {
    const payload = await buildInventoryPayload("run-inv-1");
    const buf = await inventoryEmitter.emitXlsx(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(2000);
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining(["Cover", "Recon Face", "Item Detail", "Source Data"]),
    );
  });

  it("emitPdf() produces a %PDF buffer", async () => {
    const payload = await buildInventoryPayload("run-inv-1");
    const buf = await inventoryEmitter.emitPdf(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
