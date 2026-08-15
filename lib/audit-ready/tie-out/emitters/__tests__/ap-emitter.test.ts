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
    runId: "run-ap-1",
    engagementId: "eng-1",
    pbcRequestId: "pbc-1",
    grossVarianceCents: 0,
    identifiedItemsTotalCents: 0,
    unidentifiedResidualCents: 0,
    reconcilingItemCount: 0,
    unresolvedMaterialCount: 0,
    reconOutcome: "reconciled_exact",
    allowsTimingReconciled: false,
    baselineSyncId: null,
    urmBridgePersistedAt: "2026-07-24T12:00:00Z",
    items: [],
  })),
}));

import { apEmitter, buildApPayload } from "../ap-emitter";

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  engagements["eng-1"] = { engagement_name: "Pilot Client" };
  runs["run-ap-1"] = {
    id: "run-ap-1",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "ap_aging",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 1,
      kind: "ap_aging",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
      aging_detail: {
        total_cents: 25000,
        vendors: [
          { vendor_ref: "v1", vendor_display_name: "Acme Supply", total_cents: 20000 },
          { vendor_ref: "v2", vendor_display_name: "Beta Parts", total_cents: 10000 },
          { vendor_ref: "v3", vendor_display_name: "Credit Memo Co", total_cents: -5000 },
        ],
      },
      trial_balance: { lines: [] },
    },
    subledger_total_cents: 25000,
    gl_total_cents: 25000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  variances = [
    {
      entity_kind: "totals",
      entity_qbo_id: "ap-ctrl",
      entity_display_name: "AP subledger vs GL",
      subledger_amount_cents: 25000,
      gl_amount_cents: 25000,
      variance_cents: 0,
      variance_percent: 0,
      status: "tie",
      classification_reason: null,
    },
    {
      entity_kind: "vendor",
      entity_qbo_id: "v1",
      entity_display_name: "Acme Supply",
      subledger_amount_cents: 20000,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: "auto_cleared",
      classification_reason: null,
    },
    {
      entity_kind: "vendor",
      entity_qbo_id: "v3",
      entity_display_name: "Credit Memo Co",
      subledger_amount_cents: -5000,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: "review",
      classification_reason: "vendor_debit_balance_review",
    },
  ];
});

describe("ap-emitter", () => {
  it("build() returns two_sided face with AP labels, vendor rollup, source", async () => {
    const payload = await buildApPayload("run-ap-1");
    expect(payload.face.tieOutKind).toBe("ap_aging");
    expect(payload.face.mode).toBe("two_sided");
    expect(payload.face.leftLabel).toContain("AP Subledger");
    expect(payload.face.rightLabel).toContain("GL AP Account");
    expect(payload.face.leftAmountCents).toBe(25000);
    expect(payload.face.rightAmountCents).toBe(25000);
    expect(payload.face.varianceCents).toBe(0);
    expect(payload.face.reconOutcome).toBe("reconciled_exact");
    expect(payload.face.unidentifiedResidualCents).toBe(0);
    expect(payload.backupTabs.length).toBeGreaterThan(0);
    expect(payload.backupTabs[0]!.tabName).toBe("Vendor Rollup");
    expect(payload.backupTabs[0]!.rows.length).toBe(3);
    expect(payload.backupTabs.some((t) => t.tabName === "Reconciling Items")).toBe(
      true,
    );
    const debitRow = payload.backupTabs[0]!.rows.find((r) => r.vendor_ref === "v3");
    expect(String(debitRow?.status)).toContain("debit balance");
    expect(payload.sourceData.apiResponseJson).toMatchObject({
      kind: "ap_aging",
      qbo_realm_id: "realm-1",
    });
  });

  it("emitXlsx() produces workbook with Cover/Face/Vendor Rollup/Reconciling Items/Source", async () => {
    const payload = await buildApPayload("run-ap-1");
    const buf = await apEmitter.emitXlsx(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(2000);
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining([
        "Cover",
        "Recon Face",
        "Vendor Rollup",
        "Reconciling Items",
        "Source Data",
      ]),
    );
  });

  it("emitPdf() produces a %PDF buffer", async () => {
    const payload = await buildApPayload("run-ap-1");
    const buf = await apEmitter.emitPdf(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
