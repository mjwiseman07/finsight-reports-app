import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkpaperPayload } from "@/lib/audit-ready/tie-out/workpaper-emitter";

const runs: Record<string, unknown> = {};
const engagements: Record<string, unknown> = {};
const artifacts: Record<string, unknown>[] = [];
const txns: Record<string, unknown>[] = [];

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
  // thenable for .select().eq().order() list queries
  (chain as { then?: unknown }).then = (
    resolve: (v: unknown) => unknown,
  ) => {
    if (table === "audit_ready_bs_recon_transactions") {
      return Promise.resolve(
        resolve({ data: txns, error: null }),
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
  bsAccountEmitter,
  buildBsAccountPayload,
} from "../bs-account-emitter";

beforeEach(() => {
  Object.keys(runs).forEach((k) => delete runs[k]);
  artifacts.length = 0;
  txns.length = 0;
  runs["run-bs-1"] = {
    id: "run-bs-1",
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
      gl_detail: { activity: [] },
    },
    subledger_total_cents: 10000,
    gl_total_cents: 10000,
    totals_variance_cents: 0,
    completed_at: "2026-07-24T12:00:00Z",
  };
  engagements["eng-1"] = { engagement_name: "Pilot Client" };
  artifacts.push({
    beginning_balance_cents: 5000,
    ending_balance_cents: 10000,
    gl_ending_balance_cents: 10000,
    tie_variance_cents: 0,
    qbo_account_name: "Cash",
    period_start: "2026-01-01",
    period_end: "2026-12-31",
  });
  txns.push({
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
  });
});

describe("bs-account-emitter", () => {
  it("build() returns face/backup/source consistent with Path Y snapshot", async () => {
    const payload = await buildBsAccountPayload("run-bs-1");
    expect(payload.face.tieOutKind).toBe("bs_account_recon");
    expect(
      payload.face.leftAmountCents - payload.face.rightAmountCents,
    ).toBe(payload.face.varianceCents);
    expect(payload.face.sections.length).toBeGreaterThan(0);
    expect(payload.backupTabs.length).toBeGreaterThan(0);
    expect(payload.backupTabs[0]!.columns.length).toBeGreaterThan(0);
    expect(payload.backupTabs[0]!.rows.length).toBe(1);
    expect(payload.sourceData.apiResponseJson).toMatchObject({
      kind: "bs_account_recon",
      qbo_realm_id: "realm-1",
    });
    expect(payload.sourceData.fetchedAt).toBe("2026-07-24T12:00:00Z");
  });

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
        { label: "Beginning Balance", amountCents: 5000, backupTabName: "Activity Detail" },
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
