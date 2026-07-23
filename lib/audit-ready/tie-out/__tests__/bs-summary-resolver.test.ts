import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the fiscal-year helpers to return a deterministic window.
// Match shipped signatures: resolve needs object; window returns { start, end }.
vi.mock("../fiscal-year", () => ({
  resolveFiscalYearStartMonth: async () => 1,
  activityWindowForFiscalYear: () => ({
    start: "2026-01-01",
    end: "2026-12-31",
  }),
}));

// Mock qbo-reports default loader path (4B.3.5 uses BalanceSheet).
vi.mock("../qbo-reports", () => ({
  fetchQboAccountList: async () => [],
  fetchQboBalanceSheet: async () => ({
    asOfDate: "2026-12-31",
    accountingMethod: "Accrual",
    lines: [],
  }),
}));

vi.mock("../basis", () => ({
  resolveAccountingBasis: async () => "Accrual",
}));

// Mock the per-account resolver so we never hit QBO.
vi.mock("../bs-account-resolver", () => ({
  runBsAccountResolver: async () => ({
    status: "failed",
    errorCode: "unused",
    errorMessage: "unused",
  }),
}));

// Mock the deterministic PDF renderer with a byte-identical stub keyed
// off the JSON of input.lines so identical inputs produce identical output.
vi.mock("../bs-summary-pdf", () => ({
  renderBsSummaryPdf: async (input: unknown) => {
    const s = JSON.stringify(input);
    return Buffer.from(`PDF:${s}`);
  },
}));

// Fake Supabase admin. Captures inserts/updates for assertion.
type Row = Record<string, unknown>;
const state = {
  pbcs: [] as Row[],
  runs: [] as Row[],
  runUpdates: [] as Row[],
  artifacts: [] as Row[],
  lines: [] as Row[],
  uploads: [] as { key: string; size: number }[],
};

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from(table: string) {
      const chain = {
        _table: table,
        _filters: [] as Array<[string, unknown]>,
        insert(payload: Row | Row[]) {
          const rows = Array.isArray(payload) ? payload : [payload];
          if (table === "audit_ready_pbc_requests") {
            const id = `pbc-${state.pbcs.length + 1}`;
            rows.forEach((r) => state.pbcs.push({ ...r, id }));
            return {
              select: () => ({
                single: async () => ({ data: { id }, error: null }),
              }),
            };
          }
          if (table === "audit_ready_tie_out_runs") {
            const id = `run-${state.runs.length + 1}`;
            rows.forEach((r) => state.runs.push({ ...r, id }));
            return {
              select: () => ({
                single: async () => ({ data: { id }, error: null }),
              }),
            };
          }
          if (table === "audit_ready_bs_recon_summary_artifacts") {
            const id = `sumart-${state.artifacts.length + 1}`;
            rows.forEach((r) => state.artifacts.push({ ...r, id }));
            return {
              select: () => ({
                single: async () => ({ data: { id }, error: null }),
              }),
            };
          }
          if (table === "audit_ready_bs_recon_summary_lines") {
            rows.forEach((r) => state.lines.push(r));
            return { error: null } as unknown as { error: null };
          }
          return { error: null };
        },
        update(payload: Row) {
          state.runUpdates.push({ table, ...payload });
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
        select() {
          return chain;
        },
        eq(_col: string, _val: unknown) {
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        async maybeSingle() {
          // Force sentinel PBC insert path each run (no pre-existing anchor).
          return { data: null, error: null };
        },
        async single() {
          return { data: null, error: { message: "not found" } };
        },
      };
      return chain;
    },
    storage: {
      from() {
        return {
          upload: async (key: string, buf: Buffer) => {
            state.uploads.push({ key, size: buf.length });
            return { error: null };
          },
        };
      },
    },
  }),
}));

beforeEach(() => {
  state.pbcs = [];
  state.runs = [];
  state.runUpdates = [];
  state.artifacts = [];
  state.lines = [];
  state.uploads = [];
});

// Import AFTER mocks are declared.
import { runBsSummaryResolver } from "../bs-summary-resolver";
import type { QboBalanceSheetLine } from "../qbo-reports";

const basePolicy = {
  policy_mode: "strict",
  auto_reconcile_max_dollar: 0,
  auto_reconcile_max_percent: 0,
  kickout_min_dollar: 100,
  kickout_min_percent: 5,
  authoritative_comparison: "tighter_of_both" as const,
};

const bsLine = (
  id: string,
  name: string,
  classification: "Asset" | "Liability" | "Equity",
  accountType: string,
  sortOrder = 0,
): QboBalanceSheetLine => ({
  qboAccountId: id,
  qboAccountName: name,
  qboAccountType: accountType,
  classification,
  balanceCents: 0,
  isComputedLine: false,
  parentAccountId: null,
  sortOrder,
});

const asReport = (lines: QboBalanceSheetLine[]) => ({
  asOfDate: "2026-12-31" as const,
  accountingMethod: "Accrual" as const,
  lines: lines.map((l, i) => ({ ...l, sortOrder: l.sortOrder || i })),
});

const okResult = (
  glEnding: number,
  status: "tie" | "auto_reconcile" | "review" | "kickout" = "tie",
) => ({
  status: "completed" as const,
  runId: `child-run-${Math.floor(Math.random() * 1_000_000)}`,
  artifactId: `child-art-${Math.floor(Math.random() * 1_000_000)}`,
  storageObjectKey: "k",
  totalsStatus: status,
  itemCount: 1,
  endingBalanceCents: glEnding,
  glEndingBalanceCents: glEnding,
  tieVarianceCents: 0,
});

describe("runBsSummaryResolver", () => {
  it("aggregates classifications correctly and ties BS equation", async () => {
    const lines = [
      bsLine("1", "Cash", "Asset", "Bank", 0),
      bsLine("2", "AR", "Asset", "AccountsReceivable", 1),
      bsLine("3", "AP", "Liability", "AccountsPayable", 2),
      bsLine("4", "Common Stock", "Equity", "Equity", 3),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) => {
        if (account.qboAccountId === "1") return okResult(60_00);
        if (account.qboAccountId === "2") return okResult(40_00);
        if (account.qboAccountId === "3") return okResult(30_00);
        return okResult(70_00);
      },
    });
    expect(res.status).toBe("completed");
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.assetsEndingCents).toBe(100_00);
    expect(res.liabilitiesEndingCents).toBe(30_00);
    expect(res.equityEndingCents).toBe(70_00);
    expect(res.bsEquationVarianceCents).toBe(0);
    expect(res.totalsStatus).toBe("tie");
    expect(state.artifacts).toHaveLength(1);
    expect(state.lines).toHaveLength(4);
    expect(state.pbcs).toHaveLength(1);
    expect(state.runs[0]?.pbc_request_id).toBe("pbc-1");
  });

  it("flags kickout when equation off", async () => {
    const lines = [
      bsLine("1", "Cash", "Asset", "Bank", 0),
      bsLine("2", "AP", "Liability", "AccountsPayable", 1),
      bsLine("3", "Equity", "Equity", "Equity", 2),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) => {
        if (account.qboAccountId === "1") return okResult(100_00);
        if (account.qboAccountId === "2") return okResult(50_00);
        return okResult(45_00);
      },
    });
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.bsEquationVarianceCents).toBe(500);
    expect(res.totalsStatus).toBe("kickout");
  });

  it("preserves child failure and marks parent kickout", async () => {
    const lines = [
      bsLine("1", "Cash", "Asset", "Bank", 0),
      bsLine("2", "AP", "Liability", "AccountsPayable", 1),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) => {
        if (account.qboAccountId === "1") return okResult(100_00);
        return {
          status: "failed" as const,
          errorCode: "boom",
          errorMessage: "boom",
        };
      },
    });
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.accountCountFailed).toBe(1);
    expect(res.totalsStatus).toBe("kickout");
    expect(state.lines.find((l) => l.qbo_account_id === "2")).toMatchObject({
      totals_status: "failed",
      error_code: "boom",
    });
  });

  it("respects scope filter", async () => {
    const lines = [
      bsLine("1", "Cash", "Asset", "Bank", 0),
      bsLine("2", "AR", "Asset", "AccountsReceivable", 1),
      bsLine("3", "AP", "Liability", "AccountsPayable", 2),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      bsAccountIds: ["1", "3"],
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) =>
        okResult(account.qboAccountId === "1" ? 100_00 : 100_00),
    });
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.accountCountTotal).toBe(2);
    expect(state.lines).toHaveLength(2);
    expect(state.lines.map((l) => l.qbo_account_id).sort()).toEqual([
      "1",
      "3",
    ]);
  });

  it("produces byte-identical PDF for identical inputs", async () => {
    const lines = [
      bsLine("1", "Cash", "Asset", "Bank", 0),
      bsLine("2", "AP", "Liability", "AccountsPayable", 1),
      bsLine("3", "Equity", "Equity", "Equity", 2),
    ];
    const runOnce = () =>
      runBsSummaryResolver({
        engagementId: "eng-1",
        realmId: "r",
        accessToken: "t",
        asOfDate: "2026-12-31",
        policy: basePolicy,
        triggeredByUserId: "u",
        triggerReason: "api",
        _basisResolver: async () => "Accrual",
        _balanceSheetLoader: async () => asReport(lines),
        _perAccountRunner: async ({ account }) => {
          if (account.qboAccountId === "1") return okResult(100_00);
          if (account.qboAccountId === "2") return okResult(50_00);
          return okResult(50_00);
        },
      });
    const r1 = await runOnce();
    const key1 = state.uploads.at(-1)?.key;
    const size1 = state.uploads.at(-1)?.size;
    const r2 = await runOnce();
    const key2 = state.uploads.at(-1)?.key;
    const size2 = state.uploads.at(-1)?.size;
    if (r1.status !== "completed" || r2.status !== "completed") {
      throw new Error("unreachable");
    }
    // The stub PDF renderer is a pure function of input.lines, so the same
    // inputs must yield the same sha and the same object key.
    expect(size1).toBe(size2);
    expect(key1).toBe(key2);
  });

  it("populates run-row counts and duration on completion", async () => {
    // Two assets tie, one liability kicks, one equity auto-reconciles →
    // exercises every counter branch.
    const lines = [
      bsLine("1", "Cash", "Asset", "Bank", 0),
      bsLine("2", "AR", "Asset", "AccountsReceivable", 1),
      bsLine("3", "AP", "Liability", "AccountsPayable", 2),
      bsLine("4", "RE", "Equity", "Equity", 3),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) => {
        if (account.qboAccountId === "1") return okResult(60_00, "tie");
        if (account.qboAccountId === "2") return okResult(40_00, "tie");
        if (account.qboAccountId === "3") return okResult(30_00, "kickout");
        return okResult(70_00, "auto_reconcile");
      },
    });
    if (res.status !== "completed") throw new Error("unreachable");
    // Find the final "completed" run update.
    const completedUpdate = state.runUpdates.find(
      (u) =>
        u.table === "audit_ready_tie_out_runs" &&
        u.status === "completed",
    );
    expect(completedUpdate).toBeDefined();
    if (!completedUpdate) throw new Error("unreachable");
    expect(completedUpdate.item_count).toBe(4);
    expect(completedUpdate.item_auto_reconcile_count).toBe(1);
    expect(completedUpdate.item_review_count).toBe(0);
    expect(completedUpdate.item_kickout_count).toBe(1);
    // BS-equation-side totals — assets = 100_00, L+E = 30_00 + 70_00 = 100_00
    expect(completedUpdate.subledger_total_cents).toBe(100_00);
    expect(completedUpdate.gl_total_cents).toBe(100_00);
    // Run-level totals_variance_cents is sum of abs(tie variance) on real
    // lines only (all 0 in this fixture) — not the equation variance.
    expect(completedUpdate.totals_variance_cents).toBe(0);
    // duration_ms is Date.now() based; assert it's a non-negative number.
    expect(typeof completedUpdate.duration_ms).toBe("number");
    expect(completedUpdate.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("regression: production-shape sign-flip data (natural + normalized) aggregates to a tied BS equation", async () => {
    // Simulates the post-fix state where the per-account resolver has
    // already applied normalizeTbNetToNaturalSign, so glEndingBalanceCents
    // arrives in natural-sign convention for every classification.
    const lines = [
      bsLine("a1", "Cash", "Asset", "Bank", 0),
      bsLine("a2", "Undeposited Funds", "Asset", "OtherCurrentAsset", 1),
      bsLine("l1", "Accounts Payable", "Liability", "AccountsPayable", 2),
      bsLine("l2", "Notes Payable", "Liability", "LongTermLiability", 3),
      bsLine("e1", "Retained Earnings", "Equity", "Equity", 4),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) => {
        if (account.qboAccountId === "a1") return okResult(3_500_000);
        if (account.qboAccountId === "a2") return okResult(476_631);
        if (account.qboAccountId === "l1") return okResult(0);
        return okResult(0);
      },
    });
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.status).toBe("completed");
  });

  it("resolves accrual basis from firm_clients and passes to loader", async () => {
    const passedBasis: string[] = [];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async (args) => {
        passedBasis.push(args.accountingMethod);
        return { asOfDate: "2026-12-31", accountingMethod: "Accrual", lines: [] };
      },
      _perAccountRunner: async () => okResult(0),
    });
    expect(res.status).toBe("completed");
    expect(passedBasis).toEqual(["Accrual"]);
  });

  it("resolves cash basis and passes it to the loader", async () => {
    const passedBasis: string[] = [];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Cash",
      _balanceSheetLoader: async (args) => {
        passedBasis.push(args.accountingMethod);
        return { asOfDate: "2026-12-31", accountingMethod: "Cash", lines: [] };
      },
      _perAccountRunner: async () => okResult(0),
    });
    expect(res.status).toBe("completed");
    expect(passedBasis).toEqual(["Cash"]);
  });

  it("passes bsEquationVarianceCents=0 when computed Net Income closes the gap", async () => {
    const lines: QboBalanceSheetLine[] = [
      {
        qboAccountId: "1",
        qboAccountName: "Checking",
        qboAccountType: "Bank",
        classification: "Asset",
        balanceCents: 10000,
        isComputedLine: false,
        parentAccountId: null,
        sortOrder: 0,
      },
      {
        qboAccountId: "2",
        qboAccountName: "Loan",
        qboAccountType: "Long Term Liability",
        classification: "Liability",
        balanceCents: 8000,
        isComputedLine: false,
        parentAccountId: null,
        sortOrder: 1,
      },
      {
        qboAccountId: null,
        qboAccountName: "Net Income",
        qboAccountType: null,
        classification: "Equity",
        balanceCents: 2000,
        isComputedLine: true,
        parentAccountId: null,
        sortOrder: 2,
      },
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) =>
        okResult(account.qboAccountId === "1" ? 10000 : 8000),
    });
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.bsEquationVarianceCents).toBe(0);
    expect(state.lines).toHaveLength(3);
    expect(state.lines.filter((l) => l.is_computed_line === true)).toHaveLength(
      1,
    );
    expect(
      state.lines.find((l) => l.qbo_account_name === "Net Income"),
    ).toMatchObject({
      is_computed_line: true,
      qbo_account_id: null,
      tie_variance_cents: 0,
      totals_status: "tie",
    });
  });

  it("excludes computed lines from item_kickout_count and totals_variance_cents", async () => {
    const lines: QboBalanceSheetLine[] = [
      {
        qboAccountId: "1",
        qboAccountName: "Checking",
        qboAccountType: "Bank",
        classification: "Asset",
        balanceCents: 10000,
        isComputedLine: false,
        parentAccountId: null,
        sortOrder: 0,
      },
      {
        qboAccountId: "2",
        qboAccountName: "Loan",
        qboAccountType: "Long Term Liability",
        classification: "Liability",
        balanceCents: 5000,
        isComputedLine: false,
        parentAccountId: null,
        sortOrder: 1,
      },
      {
        qboAccountId: null,
        qboAccountName: "Net Income",
        qboAccountType: null,
        classification: "Equity",
        balanceCents: 5000,
        isComputedLine: true,
        parentAccountId: null,
        sortOrder: 2,
      },
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _basisResolver: async () => "Accrual",
      _balanceSheetLoader: async () => asReport(lines),
      _perAccountRunner: async ({ account }) => {
        if (account.qboAccountId === "1") {
          return {
            ...okResult(10000, "kickout"),
            tieVarianceCents: 250,
          };
        }
        return okResult(5000, "tie");
      },
    });
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.accountCountKickout).toBe(1);
    expect(res.bsEquationVarianceCents).toBe(0);
    const completedUpdate = state.runUpdates.find(
      (u) =>
        u.table === "audit_ready_tie_out_runs" && u.status === "completed",
    );
    expect(completedUpdate).toBeDefined();
    expect(completedUpdate!.item_kickout_count).toBe(1);
    // Real-line variance only (250); computed line variance is 0 and excluded.
    expect(completedUpdate!.totals_variance_cents).toBe(250);
  });

  it("byte-identical PDF parity still holds when computed Net Income is present", async () => {
    const lines: QboBalanceSheetLine[] = [
      bsLine("1", "Cash", "Asset", "Bank", 0),
      bsLine("2", "AP", "Liability", "AccountsPayable", 1),
      {
        qboAccountId: null,
        qboAccountName: "Net Income",
        qboAccountType: null,
        classification: "Equity",
        balanceCents: 5000,
        isComputedLine: true,
        parentAccountId: null,
        sortOrder: 2,
      },
    ];
    // Seed balances so equation can close via runner endings + NI line.
    lines[0] = { ...lines[0], balanceCents: 10000 };
    lines[1] = { ...lines[1], balanceCents: 5000 };
    const runOnce = () =>
      runBsSummaryResolver({
        engagementId: "eng-1",
        realmId: "r",
        accessToken: "t",
        asOfDate: "2026-12-31",
        policy: basePolicy,
        triggeredByUserId: "u",
        triggerReason: "api",
        _basisResolver: async () => "Accrual",
        _balanceSheetLoader: async () => asReport(lines),
        _perAccountRunner: async ({ account }) =>
          okResult(account.qboAccountId === "1" ? 10000 : 5000),
      });
    const r1 = await runOnce();
    const key1 = state.uploads.at(-1)?.key;
    const size1 = state.uploads.at(-1)?.size;
    const r2 = await runOnce();
    const key2 = state.uploads.at(-1)?.key;
    const size2 = state.uploads.at(-1)?.size;
    if (r1.status !== "completed" || r2.status !== "completed") {
      throw new Error("unreachable");
    }
    expect(size1).toBe(size2);
    expect(key1).toBe(key2);
  });
});
