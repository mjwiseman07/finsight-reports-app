import { describe, it, expect, vi, beforeEach } from "vitest";

const runs: Record<string, unknown> = {};
const artifacts: Record<string, unknown>[] = [];
const lines: Record<string, unknown>[] = [];

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
      if (table === "audit_ready_fa_rollforward_artifacts") {
        return { data: artifacts[0] ?? null, error: null };
      }
      if (table === "audit_ready_engagements") {
        return { data: { engagement_name: "Pilot Client" }, error: null };
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
  (chain as { then?: unknown }).then = (
    resolve: (v: unknown) => unknown,
  ) => {
    if (table === "audit_ready_fa_rollforward_lines") {
      return Promise.resolve(resolve({ data: lines, error: null }));
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

import {
  faRollforwardEmitter,
  buildFaRollforwardPayload,
} from "../fa-rollforward-emitter";

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  artifacts.length = 0;
  lines.length = 0;
  runs["run-fa-1"] = {
    id: "run-fa-1",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "fixed_asset_rollforward",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 1,
      kind: "fixed_asset_rollforward",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
    },
    subledger_total_cents: 90000,
    gl_total_cents: 90000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  artifacts.push({
    cost_beginning_cents: 100000,
    cost_additions_cents: 25000,
    cost_disposals_cents: 0,
    cost_reclass_cents: 0,
    cost_ending_cents: 125000,
    cost_gl_ending_cents: 125000,
    accum_beginning_cents: 20000,
    accum_depreciation_cents: 15000,
    accum_disposals_cents: 0,
    accum_reclass_cents: 0,
    accum_ending_cents: 35000,
    accum_gl_ending_cents: 35000,
    nbv_beginning_cents: 80000,
    nbv_ending_cents: 90000,
    period_end: "2026-12-31",
  });
  lines.push(
    {
      side: "cost",
      bucket: "addition",
      qbo_account_id: "fa-1",
      qbo_account_name: "Vehicles",
      txn_date: "2026-02-01",
      txn_type: "Bill",
      doc_number: "B-1",
      name_display: "Dealer",
      memo: "Truck",
      split_account: "AP",
      debit_cents: 25000,
      credit_cents: 0,
      signed_cents: 25000,
    },
    {
      side: "accum",
      bucket: "depreciation",
      qbo_account_id: "fa-ad",
      qbo_account_name: "Accum Depr",
      txn_date: "2026-03-31",
      txn_type: "Journal Entry",
      doc_number: "JE-1",
      name_display: null,
      memo: "Monthly depr",
      split_account: "Depr Exp",
      debit_cents: 0,
      credit_cents: 15000,
      signed_cents: 15000,
    },
  );
});

describe("fa-rollforward-emitter", () => {
  it("build() includes Additions/Depreciation tabs with qbo account columns", async () => {
    const payload = await buildFaRollforwardPayload("run-fa-1");
    expect(payload.face.tieOutKind).toBe("fixed_asset_rollforward");
    expect(
      payload.face.leftAmountCents - payload.face.rightAmountCents,
    ).toBe(payload.face.varianceCents);
    expect(payload.face.sections.length).toBeGreaterThanOrEqual(5);
    const tabNames = payload.backupTabs.map((t) => t.tabName);
    expect(tabNames).toEqual(
      expect.arrayContaining([
        "Additions",
        "Disposals",
        "Depreciation",
        "Reclass",
        "Activity Detail",
      ]),
    );
    const adds = payload.backupTabs.find((t) => t.tabName === "Additions")!;
    expect(adds.columns.map((c) => c.key)).toEqual(
      expect.arrayContaining(["qbo_account_id", "qbo_account_name"]),
    );
    expect(adds.rows).toHaveLength(1);
    expect(payload.sourceData.apiResponseJson).toMatchObject({
      kind: "fixed_asset_rollforward",
    });
  });

  it("emitXlsx() workbook includes Cover, Recon Face, Additions, Source Data", async () => {
    const payload = await buildFaRollforwardPayload("run-fa-1");
    const buf = await faRollforwardEmitter.emitXlsx(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(3000);
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining([
        "Cover",
        "Recon Face",
        "Additions",
        "Depreciation",
        "Source Data",
      ]),
    );
  });

  it("emitPdf() produces a %PDF buffer", async () => {
    const payload = await buildFaRollforwardPayload("run-fa-1");
    const buf = await faRollforwardEmitter.emitPdf(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
