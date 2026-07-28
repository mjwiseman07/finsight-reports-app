import { describe, it, expect, vi, beforeEach } from "vitest";

const runs: Record<string, unknown> = {};
const artifacts: Record<string, unknown>[] = [];
const lines: Record<string, unknown>[] = [];
let variances: Record<string, unknown>[] = [];
const fromTables: string[] = [];

const ROLLFORWARD_TOTALS = {
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
};

const LINE_ADDITION = {
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
};

const LINE_DEPR = {
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
  faRollforwardEmitter,
  buildFaRollforwardPayload,
} from "../fa-rollforward-emitter";

function seedCanonicalRun(runId: string) {
  runs[runId] = {
    id: runId,
    engagement_id: "eng-1",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
    tie_out_kind: "fixed_asset_rollforward",
    totals_status: "tie",
    kickout_min_dollar: 1,
    raw_qbo_payload_jsonb: {
      version: 2,
      kind: "fixed_asset_rollforward",
      fetched_at: "2026-07-24T12:00:00Z",
      qbo_realm_id: "realm-1",
      qbo_connection_id: "",
      account_list: [],
      per_account_gl: {},
      trial_balance: { lines: [] },
      rollforward_totals: { ...ROLLFORWARD_TOTALS },
      lines: [{ ...LINE_ADDITION }, { ...LINE_DEPR }],
    },
    subledger_total_cents: 90000,
    gl_total_cents: 90000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
}

function seedLegacyTables() {
  artifacts.length = 0;
  lines.length = 0;
  artifacts.push({ ...ROLLFORWARD_TOTALS });
  lines.push({ ...LINE_ADDITION }, { ...LINE_DEPR });
}

function seedFallbackRun(runId: string) {
  runs[runId] = {
    id: runId,
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
  seedLegacyTables();
}

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  artifacts.length = 0;
  lines.length = 0;
  fromTables.length = 0;
  variances = [];
  seedCanonicalRun("run-fa-1");
  seedLegacyTables();
});

describe("faRollforwardEmitter", () => {
  describe("canonical path", () => {
    it("assembles face from rollforward_totals + run totals", async () => {
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).not.toContain("audit_ready_fa_rollforward_artifacts");
      expect(payload.face.tieOutKind).toBe("fixed_asset_rollforward");
      expect(payload.face.leftAmountCents).toBe(90000);
      expect(payload.face.rightAmountCents).toBe(90000);
      expect(
        payload.face.leftAmountCents - (payload.face.rightAmountCents ?? 0),
      ).toBe(payload.face.varianceCents);
      expect(payload.face.sections.length).toBeGreaterThanOrEqual(5);
      expect(payload.sourceData.apiResponseJson).toMatchObject({
        kind: "fixed_asset_rollforward",
        version: 2,
      });
    });

    it("assembles backupTabs from payload lines", async () => {
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).not.toContain("audit_ready_fa_rollforward_lines");
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
    });

    it("returns kickout-linked variances via loadVariances", async () => {
      variances = [
        {
          entity_kind: "totals",
          entity_qbo_id: null,
          entity_display_name: "FA rollforward",
          subledger_amount_cents: 90000,
          gl_amount_cents: 90000,
          variance_cents: 0,
          variance_percent: 0,
          status: "kickout",
          classification_reason: null,
        },
      ];
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).toContain("audit_ready_tie_out_variances");
      expect(payload.face.tieStatus).toBe("kickout");
    });
  });

  describe("legacy fallback", () => {
    it("fires fallback when raw_qbo_payload_jsonb is v1 without totals", async () => {
      seedFallbackRun("run-fa-1");
      fromTables.length = 0;
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).toContain("audit_ready_fa_rollforward_artifacts");
      expect(payload.face.leftAmountCents).toBe(90000);
    });

    it("fires fallback when rollforward_totals is missing", async () => {
      const raw = (
        runs["run-fa-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> }
      ).raw_qbo_payload_jsonb;
      delete raw.rollforward_totals;
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).toContain("audit_ready_fa_rollforward_artifacts");
    });

    it("fires fallback when lines is not an array", async () => {
      const raw = (
        runs["run-fa-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> }
      ).raw_qbo_payload_jsonb;
      raw.lines = null;
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).toContain("audit_ready_fa_rollforward_artifacts");
    });

    it("fires fallback when run totals are null", async () => {
      (runs["run-fa-1"] as { gl_total_cents: unknown }).gl_total_cents = null;
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).toContain("audit_ready_fa_rollforward_artifacts");
    });

    it("fires fallback when nbv_ending_cents missing from totals", async () => {
      const raw = (
        runs["run-fa-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> }
      ).raw_qbo_payload_jsonb;
      const totals = { ...(raw.rollforward_totals as Record<string, unknown>) };
      delete totals.nbv_ending_cents;
      raw.rollforward_totals = totals;
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).toContain("audit_ready_fa_rollforward_artifacts");
    });

    it("assembles face + backupTabs from legacy artifact + lines", async () => {
      seedFallbackRun("run-fa-1");
      fromTables.length = 0;
      const payload = await buildFaRollforwardPayload("run-fa-1");
      expect(fromTables).toContain("audit_ready_fa_rollforward_artifacts");
      expect(fromTables).toContain("audit_ready_fa_rollforward_lines");
      expect(payload.face.sections.length).toBeGreaterThanOrEqual(5);
      const adds = payload.backupTabs.find((t) => t.tabName === "Additions")!;
      expect(adds.rows).toHaveLength(1);
    });
  });

  describe("byte-identity invariant", () => {
    it("produces identical output from canonical vs fallback given identical source data", async () => {
      seedCanonicalRun("run-fa-1");
      seedLegacyTables();
      const canonicalResult = await buildFaRollforwardPayload("run-fa-1");

      seedFallbackRun("run-fa-1");
      const fallbackResult = await buildFaRollforwardPayload("run-fa-1");

      expect(canonicalResult.face).toEqual(fallbackResult.face);
      expect(canonicalResult.backupTabs).toEqual(fallbackResult.backupTabs);
    });
  });

  describe("emit", () => {
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
});
