import { describe, it, expect, vi, beforeEach } from "vitest";

const runs: Record<string, unknown> = {};
const artifacts: Record<string, unknown>[] = [];
const summaryLines: Record<string, unknown>[] = [];
const childTxns: Record<string, Record<string, unknown>[]> = {};

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
      if (table === "audit_ready_bs_recon_summary_artifacts") {
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
    if (table === "audit_ready_bs_recon_summary_lines") {
      return Promise.resolve(resolve({ data: summaryLines, error: null }));
    }
    if (table === "audit_ready_bs_recon_transactions") {
      const runId = filters.find((f) => f[0] === "run_id")?.[1];
      return Promise.resolve(
        resolve({ data: childTxns[String(runId)] ?? [], error: null }),
      );
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
  bsSummaryEmitter,
  buildBsSummaryPayload,
} from "../bs-summary-emitter";

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  artifacts.length = 0;
  summaryLines.length = 0;
  Object.keys(childTxns).forEach((k) => delete childTxns[k]);
  runs["run-sum-1"] = {
    id: "run-sum-1",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "bs_recon_summary",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 1,
      kind: "bs_recon_summary",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      balance_sheet: { lines: [] },
    },
    subledger_total_cents: 100000,
    gl_total_cents: 100000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  artifacts.push({
    assets_ending_cents: 100000,
    liabilities_ending_cents: 40000,
    equity_ending_cents: 60000,
    bs_equation_variance_cents: 0,
    bs_equation_status: "tie",
    period_end: "2026-12-31",
  });
  summaryLines.push(
    {
      classification: "Asset",
      qbo_account_id: "1",
      qbo_account_name: "Cash",
      qbo_account_type: "Bank",
      ending_balance_cents: 100000,
      gl_ending_balance_cents: 100000,
      tie_variance_cents: 0,
      totals_status: "tie",
      is_computed_line: false,
      child_run_id: "child-1",
      sort_order: 0,
    },
    {
      classification: "Liability",
      qbo_account_id: "2",
      qbo_account_name: "AP",
      qbo_account_type: "AccountsPayable",
      ending_balance_cents: 40000,
      gl_ending_balance_cents: 40000,
      tie_variance_cents: 0,
      totals_status: "tie",
      is_computed_line: false,
      child_run_id: "child-2",
      sort_order: 1,
    },
    {
      classification: "Equity",
      qbo_account_id: null,
      qbo_account_name: "Net Income",
      qbo_account_type: null,
      ending_balance_cents: 60000,
      gl_ending_balance_cents: 60000,
      tie_variance_cents: 0,
      totals_status: "tie",
      is_computed_line: true,
      child_run_id: null,
      sort_order: 2,
    },
  );
  childTxns["child-1"] = [
    {
      ordinal: 0,
      txn_date: "2026-01-10",
      txn_type: "Deposit",
      doc_number: "D1",
      name_display: "Cust",
      memo: "m",
      debit_cents: 1000,
      credit_cents: 0,
      net_cents: 1000,
    },
  ];
  childTxns["child-2"] = [];
});

describe("bs-summary-emitter", () => {
  it("build() face equation + Included Accounts + per-account tabs", async () => {
    const payload = await buildBsSummaryPayload("run-sum-1");
    expect(payload.face.tieOutKind).toBe("bs_recon_summary");
    expect(
      payload.face.leftAmountCents - (payload.face.rightAmountCents ?? 0),
    ).toBe(payload.face.varianceCents);
    expect(payload.face.sections.map((s) => s.label)).toEqual(
      expect.arrayContaining(["Assets", "Liabilities", "Equity", "Net Income"]),
    );
    expect(payload.backupTabs[0]!.tabName).toBe("Included Accounts");
    expect(payload.backupTabs[0]!.rows).toHaveLength(3);
    const cashTab = payload.backupTabs.find((t) => t.tabName === "Cash");
    expect(cashTab?.rows.length).toBe(1);
    const niTab = payload.backupTabs.find((t) => t.tabName === "Net Income");
    expect(String(niTab?.rows[0]?.note ?? "")).toMatch(/computed/i);
    expect(payload.sourceData.apiResponseJson).toMatchObject({
      kind: "bs_recon_summary",
    });
  });

  it("emitXlsx() produces Cover / Recon Face / Source Data sheets", async () => {
    const payload = await buildBsSummaryPayload("run-sum-1");
    const buf = await bsSummaryEmitter.emitXlsx(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(3000);
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining(["Cover", "Recon Face", "Included Accounts", "Source Data"]),
    );
  });

  it("emitPdf() produces a %PDF buffer", async () => {
    const payload = await buildBsSummaryPayload("run-sum-1");
    const buf = await bsSummaryEmitter.emitPdf(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
