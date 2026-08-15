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
    runId: "run-ar-1",
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

import { arEmitter, buildArPayload } from "../ar-emitter";

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  engagements["eng-1"] = { engagement_name: "Pilot Client" };
  runs["run-ar-1"] = {
    id: "run-ar-1",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "ar_aging",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 1,
      kind: "ar_aging",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
      aging_detail: {
        total_cents: 45000,
        customers: [
          { customer_ref: "c1", customer_display_name: "North LLC", total_cents: 50000 },
          { customer_ref: "c2", customer_display_name: "South Inc", total_cents: -5000 },
        ],
      },
      trial_balance: { lines: [] },
    },
    subledger_total_cents: 45000,
    gl_total_cents: 45000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  variances = [
    {
      entity_kind: "totals",
      entity_qbo_id: "ar-ctrl",
      entity_display_name: "AR subledger vs GL",
      subledger_amount_cents: 45000,
      gl_amount_cents: 45000,
      variance_cents: 0,
      variance_percent: 0,
      status: "tie",
      classification_reason: null,
    },
    {
      entity_kind: "customer",
      entity_qbo_id: "c2",
      entity_display_name: "South Inc",
      subledger_amount_cents: -5000,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: "review",
      classification_reason: "credit balance",
    },
  ];
});

describe("ar-emitter", () => {
  it("build() returns two_sided face with AR labels + credit-balance status", async () => {
    const payload = await buildArPayload("run-ar-1");
    expect(payload.face.tieOutKind).toBe("ar_aging");
    expect(payload.face.mode).toBe("two_sided");
    expect(payload.face.leftLabel).toContain("AR Subledger");
    expect(payload.face.rightLabel).toContain("GL AR Account");
    expect(payload.face.reconOutcome).toBe("reconciled_exact");
    expect(payload.face.unidentifiedResidualCents).toBe(0);
    expect(payload.face.identifiedItemsTotalCents).toBe(0);
    expect(payload.backupTabs[0]!.tabName).toBe("Customer Rollup");
    expect(payload.backupTabs.some((t) => t.tabName === "Reconciling Items")).toBe(
      true,
    );
    const creditRow = payload.backupTabs[0]!.rows.find(
      (r) => r.customer_ref === "c2",
    );
    expect(String(creditRow?.status)).toContain("credit balance");
    expect(payload.sourceData.apiResponseJson).toMatchObject({ kind: "ar_aging" });
  });

  it("emitXlsx() produces workbook with Cover/Face/Customer Rollup/Reconciling Items/Source", async () => {
    const payload = await buildArPayload("run-ar-1");
    const buf = await arEmitter.emitXlsx(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(2000);
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining([
        "Cover",
        "Recon Face",
        "Customer Rollup",
        "Reconciling Items",
        "Source Data",
      ]),
    );
  });

  it("emitPdf() produces a %PDF buffer", async () => {
    const payload = await buildArPayload("run-ar-1");
    const buf = await arEmitter.emitPdf(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
