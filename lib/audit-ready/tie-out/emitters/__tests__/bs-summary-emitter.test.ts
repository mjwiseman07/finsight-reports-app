import { describe, it, expect, vi, beforeEach } from "vitest";

const runs: Record<string, unknown> = {};
const artifacts: Record<string, unknown>[] = [];
const summaryLines: Record<string, unknown>[] = [];
const childTxns: Record<string, Record<string, unknown>[]> = {};
let variances: Record<string, unknown>[] = [];
const fromTables: string[] = [];

const SUMMARY_TOTALS = {
  assets_ending_cents: 100000,
  liabilities_ending_cents: 40000,
  equity_ending_cents: 60000,
  bs_equation_variance_cents: 0,
  bs_equation_status: "tie",
  period_end: "2026-12-31",
};

const SUMMARY_LINES = [
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
];

const CHILD1_ACTIVITY = {
  txnDate: "2026-01-10",
  txnType: "Deposit",
  docNumber: "D1",
  name: "Cust",
  memo: "m",
  splitAccount: null,
  debitCents: 1000,
  creditCents: 0,
  netCents: 1000,
  runningBalanceCents: 1000,
  txnRef: null,
};

const CHILD1_LEGACY_TXN = {
  ordinal: 0,
  txn_date: "2026-01-10",
  txn_type: "Deposit",
  doc_number: "D1",
  name_display: "Cust",
  memo: "m",
  debit_cents: 1000,
  credit_cents: 0,
  net_cents: 1000,
};

function makeChain(table: string) {
  fromTables.push(table);
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

import {
  bsSummaryEmitter,
  buildBsSummaryPayload,
} from "../bs-summary-emitter";

function seedChildRuns(opts: { withGlDetail: boolean }) {
  runs["child-1"] = {
    id: "child-1",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "bs_account_recon",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: opts.withGlDetail
      ? {
          version: 1,
          kind: "bs_account_recon",
          fetched_at: "2026-07-24T12:00:00Z",
          qbo_realm_id: "realm-1",
          qbo_connection_id: "",
          gl_detail: {
            beginningBalanceCents: 0,
            endingBalanceCents: 1000,
            activity: [CHILD1_ACTIVITY],
          },
        }
      : {
          version: 1,
          kind: "bs_account_recon",
          fetched_at: "2026-07-24T12:00:00Z",
          qbo_realm_id: "realm-1",
          qbo_connection_id: "",
        },
    subledger_total_cents: 1000,
    gl_total_cents: 1000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  runs["child-2"] = {
    id: "child-2",
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "bs_account_recon",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 1,
      kind: "bs_account_recon",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
      gl_detail: {
        beginningBalanceCents: 0,
        endingBalanceCents: 0,
        activity: [],
      },
    },
    subledger_total_cents: 0,
    gl_total_cents: 0,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
}

function seedCanonicalRun(runId: string) {
  runs[runId] = {
    id: runId,
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "bs_recon_summary",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 2,
      kind: "bs_recon_summary",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
      balance_sheet: { lines: [] },
      summary_totals: { ...SUMMARY_TOTALS },
      summary_lines: SUMMARY_LINES.map((l) => ({ ...l })),
    },
    subledger_total_cents: 100000,
    gl_total_cents: 100000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  seedChildRuns({ withGlDetail: true });
}

function seedLegacyTables() {
  artifacts.length = 0;
  summaryLines.length = 0;
  Object.keys(childTxns).forEach((k) => delete childTxns[k]);
  artifacts.push({ ...SUMMARY_TOTALS });
  summaryLines.push(...SUMMARY_LINES.map((l) => ({ ...l })));
  childTxns["child-1"] = [{ ...CHILD1_LEGACY_TXN }];
  childTxns["child-2"] = [];
}

function seedFallbackRun(runId: string) {
  runs[runId] = {
    id: runId,
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
  seedLegacyTables();
  // Child runs without gl_detail so both paths share legacy txn fallback for tabs
  seedChildRuns({ withGlDetail: false });
}

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  artifacts.length = 0;
  summaryLines.length = 0;
  Object.keys(childTxns).forEach((k) => delete childTxns[k]);
  fromTables.length = 0;
  variances = [];
  seedCanonicalRun("run-sum-1");
  seedLegacyTables();
});

describe("bsSummaryEmitter", () => {
  describe("canonical path", () => {
    it("assembles face from summary_totals + run totals", async () => {
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).not.toContain(
        "audit_ready_bs_recon_summary_artifacts",
      );
      expect(payload.face.tieOutKind).toBe("bs_recon_summary");
      expect(
        payload.face.leftAmountCents - (payload.face.rightAmountCents ?? 0),
      ).toBe(payload.face.varianceCents);
      expect(payload.face.sections.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          "Assets",
          "Liabilities",
          "Equity",
          "Net Income",
        ]),
      );
      expect(payload.sourceData.apiResponseJson).toMatchObject({
        kind: "bs_recon_summary",
        version: 2,
      });
    });

    it("assembles backupTabs from summary_lines", async () => {
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).not.toContain("audit_ready_bs_recon_summary_lines");
      expect(payload.backupTabs[0]!.tabName).toBe("Included Accounts");
      expect(payload.backupTabs[0]!.rows).toHaveLength(3);
      const niTab = payload.backupTabs.find((t) => t.tabName === "Net Income");
      expect(String(niTab?.rows[0]?.note ?? "")).toMatch(/computed/i);
    });

    it("returns kickout-linked variances via loadVariances", async () => {
      variances = [
        {
          entity_kind: "totals",
          entity_qbo_id: null,
          entity_display_name: "BS summary",
          subledger_amount_cents: 100000,
          gl_amount_cents: 100000,
          variance_cents: 0,
          variance_percent: 0,
          status: "kickout",
          classification_reason: null,
        },
      ];
      // equation status "tie" still forces kickout when status map sees kickout
      // via totalsVar — but face uses bs_equation_status === "kickout" first.
      // Force equation kickout so tieStatus is kickout on canonical path.
      const raw = (
        runs["run-sum-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> }
      ).raw_qbo_payload_jsonb;
      raw.summary_totals = {
        ...SUMMARY_TOTALS,
        bs_equation_status: "kickout",
        bs_equation_variance_cents: 1,
      };
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).toContain("audit_ready_tie_out_variances");
      expect(payload.face.tieStatus).toBe("kickout");
    });
  });

  describe("legacy fallback", () => {
    it("fires fallback when raw_qbo_payload_jsonb is v1", async () => {
      seedFallbackRun("run-sum-1");
      fromTables.length = 0;
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_artifacts");
      expect(payload.face.leftAmountCents).toBe(100000);
    });

    it("fires fallback when summary_totals is missing", async () => {
      const raw = (
        runs["run-sum-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> }
      ).raw_qbo_payload_jsonb;
      delete raw.summary_totals;
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_artifacts");
    });

    it("fires fallback when summary_lines is not an array", async () => {
      const raw = (
        runs["run-sum-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> }
      ).raw_qbo_payload_jsonb;
      raw.summary_lines = null;
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_artifacts");
    });

    it("fires fallback when run totals are null", async () => {
      (runs["run-sum-1"] as { totals_variance_cents: unknown }).totals_variance_cents =
        null;
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_artifacts");
    });

    it("assembles face + backupTabs from legacy artifact + lines", async () => {
      seedFallbackRun("run-sum-1");
      fromTables.length = 0;
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_artifacts");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_lines");
      expect(payload.backupTabs[0]!.rows).toHaveLength(3);
      const cashTab = payload.backupTabs.find((t) => t.tabName === "Cash");
      expect(cashTab?.rows.length).toBe(1);
    });
  });

  describe("parent/child linkage", () => {
    it("aggregates child-run gl_detail.activity into parent summary backupTabs", async () => {
      seedCanonicalRun("run-sum-1");
      seedLegacyTables();
      fromTables.length = 0;
      const payload = await buildBsSummaryPayload("run-sum-1");
      const cashTab = payload.backupTabs.find((t) => t.tabName === "Cash");
      expect(cashTab?.rows).toHaveLength(1);
      expect(cashTab?.rows[0]).toMatchObject({
        ordinal: 0,
        txn_date: "2026-01-10",
        name_display: "Cust",
        debit_cents: 1000,
        net_cents: 1000,
      });
      // Prefer child payload — should not need legacy transactions for child-1
      expect(fromTables).not.toContain("audit_ready_bs_recon_transactions");
    });

    it("falls back to legacy bs_recon_transactions when child gl_detail missing", async () => {
      seedCanonicalRun("run-sum-1");
      seedLegacyTables();
      seedChildRuns({ withGlDetail: false });
      fromTables.length = 0;
      const payload = await buildBsSummaryPayload("run-sum-1");
      expect(fromTables).toContain("audit_ready_bs_recon_transactions");
      const cashTab = payload.backupTabs.find((t) => t.tabName === "Cash");
      expect(cashTab?.rows).toHaveLength(1);
      expect(cashTab?.rows[0]).toMatchObject({
        txn_date: "2026-01-10",
        debit_cents: 1000,
      });
    });
  });

  describe("byte-identity invariant", () => {
    it("produces identical output from canonical vs fallback given identical source data", async () => {
      // Both paths load child tabs via shared loadChildTxnRows. Seed children
      // without gl_detail so both resolve txn rows from the same legacy table.
      seedCanonicalRun("run-sum-1");
      seedLegacyTables();
      seedChildRuns({ withGlDetail: false });
      const canonicalResult = await buildBsSummaryPayload("run-sum-1");

      seedFallbackRun("run-sum-1");
      const fallbackResult = await buildBsSummaryPayload("run-sum-1");

      expect(canonicalResult.face).toEqual(fallbackResult.face);
      expect(canonicalResult.backupTabs).toEqual(fallbackResult.backupTabs);
    });
  });

  describe("emit", () => {
    it("emitXlsx() produces Cover / Recon Face / Source Data sheets", async () => {
      const payload = await buildBsSummaryPayload("run-sum-1");
      const buf = await bsSummaryEmitter.emitXlsx(payload);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.byteLength).toBeGreaterThan(3000);
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "buffer" });
      expect(wb.SheetNames).toEqual(
        expect.arrayContaining([
          "Cover",
          "Recon Face",
          "Included Accounts",
          "Source Data",
        ]),
      );
    });

    it("emitPdf() produces a %PDF buffer", async () => {
      const payload = await buildBsSummaryPayload("run-sum-1");
      const buf = await bsSummaryEmitter.emitPdf(payload);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    });
  });
});
