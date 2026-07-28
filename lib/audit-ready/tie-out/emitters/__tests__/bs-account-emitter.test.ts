import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkpaperPayload } from "@/lib/audit-ready/tie-out/workpaper-emitter";

const runs: Record<string, unknown> = {};
const engagements: Record<string, unknown> = {};
const artifacts: Record<string, unknown>[] = [];
const txns: Record<string, unknown>[] = [];
let variances: Record<string, unknown>[] = [];
const fromTables: string[] = [];

const ACTIVITY = {
  txnDate: "2026-03-15",
  txnType: "Deposit",
  docNumber: "1",
  name: "Customer",
  memo: "m",
  splitAccount: "Income",
  debitCents: 5000,
  creditCents: 0,
  netCents: 5000,
  runningBalanceCents: 10000,
  txnRef: null,
};

const LEGACY_TXN = {
  ordinal: 0,
  txn_date: "2026-03-15",
  txn_type: "Deposit",
  doc_number: "1",
  name_display: "Customer",
  memo: "m",
  split_account: "Income",
  debit_cents: 5000,
  credit_cents: 0,
  net_cents: 5000,
  running_balance_cents: 10000,
};

const LEGACY_ARTIFACT = {
  beginning_balance_cents: 5000,
  ending_balance_cents: 10000,
  gl_ending_balance_cents: 10000,
  tie_variance_cents: 0,
  qbo_account_name: "Cash",
  period_start: "2026-01-01",
  period_end: "2026-12-31",
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
      if (table === "audit_ready_bs_recon_artifacts") {
        return { data: artifacts[0] ?? null, error: null };
      }
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
  (chain as { then?: unknown }).then = (
    resolve: (v: unknown) => unknown,
  ) => {
    if (table === "audit_ready_bs_recon_transactions") {
      return Promise.resolve(resolve({ data: txns, error: null }));
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
  bsAccountEmitter,
  buildBsAccountPayload,
} from "../bs-account-emitter";

function seedCanonicalRun(runId: string) {
  runs[runId] = {
    id: runId,
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
        beginningBalanceCents: 5000,
        endingBalanceCents: 10000,
        activity: [ACTIVITY],
      },
      trial_balance: { lines: [] },
    },
    subledger_total_cents: 10000,
    gl_total_cents: 10000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
}

function seedLegacyTables() {
  artifacts.length = 0;
  txns.length = 0;
  artifacts.push({ ...LEGACY_ARTIFACT });
  txns.push({ ...LEGACY_TXN });
}

function seedFallbackRun(runId: string) {
  runs[runId] = {
    id: runId,
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
      // incomplete — missing beginningBalanceCents / endingBalanceCents
      gl_detail: { activity: [] },
    },
    subledger_total_cents: 10000,
    gl_total_cents: 10000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  seedLegacyTables();
}

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  artifacts.length = 0;
  txns.length = 0;
  fromTables.length = 0;
  variances = [];
  engagements["eng-1"] = { engagement_name: "Pilot Client" };
  seedCanonicalRun("run-bs-1");
  seedLegacyTables();
});

describe("bsAccountEmitter", () => {
  describe("canonical path", () => {
    it("assembles face from run totals + gl_detail", async () => {
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).not.toContain("audit_ready_bs_recon_artifacts");
      expect(payload.face.tieOutKind).toBe("bs_account_recon");
      expect(payload.face.leftAmountCents).toBe(10000);
      expect(payload.face.rightAmountCents).toBe(10000);
      expect(payload.face.varianceCents).toBe(0);
      expect(
        payload.face.leftAmountCents - (payload.face.rightAmountCents ?? 0),
      ).toBe(payload.face.varianceCents);
      expect(payload.face.sections.map((s) => s.label)).toEqual(
        expect.arrayContaining([
          "Beginning Balance",
          "Activity 2026-03",
          "Ending Balance",
        ]),
      );
      expect(payload.sourceData.apiResponseJson).toMatchObject({
        kind: "bs_account_recon",
        qbo_realm_id: "realm-1",
      });
      expect(payload.sourceData.fetchedAt).toBe("2026-07-24T12:00:00Z");
    });

    it("assembles backupTabs from gl_detail.activity", async () => {
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).not.toContain("audit_ready_bs_recon_transactions");
      expect(payload.backupTabs.length).toBeGreaterThan(0);
      expect(payload.backupTabs[0]!.tabName).toBe("Activity Detail");
      expect(payload.backupTabs[0]!.columns.length).toBeGreaterThan(0);
      expect(payload.backupTabs[0]!.rows).toHaveLength(1);
      expect(payload.backupTabs[0]!.rows[0]).toMatchObject({
        ordinal: 0,
        txn_date: "2026-03-15",
        name_display: "Customer",
        debit_cents: 5000,
        net_cents: 5000,
        running_balance_cents: 10000,
      });
    });

    it("returns kickout-linked variances via loadVariances", async () => {
      variances = [
        {
          entity_kind: "totals",
          entity_qbo_id: "cash-1",
          entity_display_name: "Cash",
          subledger_amount_cents: 10000,
          gl_amount_cents: 10000,
          variance_cents: 0,
          variance_percent: 0,
          status: "kickout",
          classification_reason: null,
        },
      ];
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).toContain("audit_ready_tie_out_variances");
      expect(payload.face.tieStatus).toBe("kickout");
    });
  });

  describe("legacy fallback", () => {
    it("fires fallback when raw_qbo_payload_jsonb is missing", async () => {
      (runs["run-bs-1"] as { raw_qbo_payload_jsonb: unknown }).raw_qbo_payload_jsonb =
        null;
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).toContain("audit_ready_bs_recon_artifacts");
      expect(payload.face.leftAmountCents).toBe(10000);
      expect(payload.backupTabs[0]!.rows).toHaveLength(1);
    });

    it("fires fallback when gl_detail is missing", async () => {
      const raw = (runs["run-bs-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> })
        .raw_qbo_payload_jsonb;
      delete raw.gl_detail;
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).toContain("audit_ready_bs_recon_artifacts");
      expect(payload.backupTabs[0]!.rows).toHaveLength(1);
    });

    it("fires fallback when run totals are null", async () => {
      (runs["run-bs-1"] as { subledger_total_cents: unknown }).subledger_total_cents =
        null;
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).toContain("audit_ready_bs_recon_artifacts");
      expect(payload.face.leftAmountCents).toBe(10000);
    });

    it("fires fallback when gl_detail.activity is not array", async () => {
      const raw = (runs["run-bs-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> })
        .raw_qbo_payload_jsonb;
      raw.gl_detail = {
        beginningBalanceCents: 5000,
        endingBalanceCents: 10000,
        activity: null,
      };
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).toContain("audit_ready_bs_recon_artifacts");
      expect(payload.backupTabs[0]!.rows).toHaveLength(1);
    });

    it("fires fallback when beginningBalanceCents is missing", async () => {
      const raw = (runs["run-bs-1"] as { raw_qbo_payload_jsonb: Record<string, unknown> })
        .raw_qbo_payload_jsonb;
      raw.gl_detail = {
        endingBalanceCents: 10000,
        activity: [ACTIVITY],
      };
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).toContain("audit_ready_bs_recon_artifacts");
    });

    it("assembles face + backupTabs from legacy artifact + transactions", async () => {
      seedFallbackRun("run-bs-1");
      fromTables.length = 0;
      const payload = await buildBsAccountPayload("run-bs-1");
      expect(fromTables).toContain("audit_ready_bs_recon_artifacts");
      expect(fromTables).toContain("audit_ready_bs_recon_transactions");
      expect(payload.face.tieOutKind).toBe("bs_account_recon");
      expect(payload.face.sections.length).toBeGreaterThan(0);
      expect(payload.backupTabs[0]!.rows).toHaveLength(1);
      expect(payload.sourceData.apiResponseJson).toMatchObject({
        kind: "bs_account_recon",
        qbo_realm_id: "realm-1",
      });
    });
  });

  describe("byte-identity invariant", () => {
    it("produces identical output from canonical vs fallback given identical source data", async () => {
      seedCanonicalRun("run-bs-1");
      seedLegacyTables();
      const canonicalResult = await buildBsAccountPayload("run-bs-1");

      seedFallbackRun("run-bs-1");
      const fallbackResult = await buildBsAccountPayload("run-bs-1");

      expect(canonicalResult.face).toEqual(fallbackResult.face);
      expect(canonicalResult.backupTabs).toEqual(fallbackResult.backupTabs);
    });
  });

  describe("emit", () => {
    it("emitXlsx() produces a non-trivial workbook with Cover/Face/Source", async () => {
      const payload = await buildBsAccountPayload("run-bs-1");
      const buf = await bsAccountEmitter.emitXlsx(payload);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.byteLength).toBeGreaterThan(2000);
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "buffer" });
      expect(wb.SheetNames).toEqual(
        expect.arrayContaining(["Cover", "Recon Face", "Source Data"]),
      );
    });

    it("emitPdf() produces a %PDF buffer", async () => {
      const payload = await buildBsAccountPayload("run-bs-1");
      const buf = await bsAccountEmitter.emitPdf(payload);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    });
  });
});

/** Fixture for emit-only smoke if build path is unavailable. */
export function sampleBsPayload(): WorkpaperPayload {
  return {
    face: {
      leftLabel: "Prepared Schedule",
      leftAmountCents: 10000,
      rightLabel: "General Ledger",
      rightAmountCents: 10000,
      varianceCents: 0,
      toleranceCents: 100,
      tieStatus: "ties",
      sections: [
        {
          label: "Beginning Balance",
          amountCents: 5000,
          backupTabName: "Activity Detail",
        },
      ],
      engagementName: "Pilot",
      engagementId: "eng-1",
      periodEnd: "2026-12-31",
      tieOutKind: "bs_account_recon",
      runId: "run-bs-1",
      generatedAt: "2026-07-24T12:00:00Z",
    },
    backupTabs: [
      {
        tabName: "Activity Detail",
        columns: [{ key: "memo", label: "Memo", format: "text" }],
        rows: [{ memo: "x" }],
      },
    ],
    sourceData: {
      qboRealmId: "r",
      qboConnectionId: "",
      apiResponseJson: { ok: true },
      fetchedAt: "2026-07-24T12:00:00Z",
    },
  };
}
