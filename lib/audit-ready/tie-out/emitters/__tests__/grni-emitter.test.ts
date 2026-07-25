import { describe, it, expect, vi, beforeEach } from "vitest";

const runs: Record<string, unknown> = {};
const engagements: Record<string, unknown> = {};
let evidence: Record<string, unknown>[] = [];

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
    if (table === "audit_ready_tie_out_variance_evidence") {
      return Promise.resolve(resolve({ data: evidence, error: null }));
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

import { grniEmitter, buildGrniPayload } from "../grni-emitter";

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  engagements["eng-1"] = { engagement_name: "Pilot Client" };
  runs["run-grni-1"] = {
    id: "run-grni-1",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "grni",
    totals_status: "review",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 1,
      kind: "grni",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
      unbilled_bills: {
        total_cents: 12000,
        bills: [
          {
            bill_id: "b1",
            txn_date: "2026-06-01",
            vendor_ref: "v1",
            vendor_display_name: "Acme Supply",
            subtotal_cents: 8000,
            doc_number: null,
            linked_po_ids: ["po-1"],
          },
          {
            bill_id: "b2",
            txn_date: "2026-05-01",
            vendor_ref: "v1",
            vendor_display_name: "Acme Supply",
            subtotal_cents: 4000,
            doc_number: null,
            linked_po_ids: [],
          },
        ],
      },
    },
    subledger_total_cents: 12000,
    gl_total_cents: null,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  evidence = [
    {
      source_qbo_id: "b1",
      source_txn_date: "2026-06-01",
      source_doc_number: null,
      vendor_ref: "v1",
      total_cents: 8000,
      subtotal_cents: 8000,
      balance_cents: 8000,
      linked_po_ids: ["po-1"],
      aging_bucket: "31-60",
      age_days_at_run: 53,
    },
    {
      source_qbo_id: "b2",
      source_txn_date: "2026-05-01",
      source_doc_number: null,
      vendor_ref: "v1",
      total_cents: 4000,
      subtotal_cents: 4000,
      balance_cents: 4000,
      linked_po_ids: [],
      aging_bucket: "61-90",
      age_days_at_run: 84,
    },
  ];
});

describe("grni-emitter", () => {
  it("build() returns report_only face with null right side and 3 backup tabs", async () => {
    const payload = await buildGrniPayload("run-grni-1");
    expect(payload.face.tieOutKind).toBe("grni");
    expect(payload.face.mode).toBe("report_only");
    expect(payload.face.rightAmountCents).toBeNull();
    expect(payload.face.rightLabel).toBeNull();
    expect(payload.face.varianceCents).toBeNull();
    expect(payload.face.tieStatus).toBe("ties");
    expect(payload.face.leftAmountCents).toBe(12000);
    const tabNames = payload.backupTabs.map((t) => t.tabName);
    expect(tabNames).toEqual([
      "Open Unbilled Bills Detail",
      "Vendor Rollup",
      "Aging by Receipt Age",
    ]);
    expect(payload.sourceData.apiResponseJson).toMatchObject({ kind: "grni" });
  });

  it("emitXlsx() produces workbook with all GRNI tabs + Source Data", async () => {
    const payload = await buildGrniPayload("run-grni-1");
    const buf = await grniEmitter.emitXlsx(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(2000);
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining([
        "Cover",
        "Recon Face",
        "Open Unbilled Bills Detail",
        "Vendor Rollup",
        "Aging by Receipt Age",
        "Source Data",
      ]),
    );
  });

  it("emitPdf() produces a %PDF buffer", async () => {
    const payload = await buildGrniPayload("run-grni-1");
    const buf = await grniEmitter.emitPdf(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
