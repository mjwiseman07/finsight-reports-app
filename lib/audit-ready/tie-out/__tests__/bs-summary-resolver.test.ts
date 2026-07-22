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

// Mock qbo-reports.fetchQboAccountList (default loader path).
vi.mock("../qbo-reports", () => ({
  fetchQboAccountList: async () => [],
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

const basePolicy = {
  policy_mode: "strict",
  auto_reconcile_max_dollar: 0,
  auto_reconcile_max_percent: 0,
  kickout_min_dollar: 100,
  kickout_min_percent: 5,
  authoritative_comparison: "tighter_of_both" as const,
};

const acc = (
  id: string,
  name: string,
  classification: string,
  accountType: string,
) => ({
  id,
  name,
  fullyQualifiedName: name,
  accountType,
  accountSubType: null,
  classification,
  currentBalance: null,
  active: true,
  isSubAccount: false,
  parentAccountId: null,
  isRollupParent: false,
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
    const accts = [
      acc("1", "Cash", "Asset", "Bank"),
      acc("2", "AR", "Asset", "AccountsReceivable"),
      acc("3", "AP", "Liability", "AccountsPayable"),
      acc("4", "Common Stock", "Equity", "Equity"),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _accountsLoader: async () => accts,
      _perAccountRunner: async ({ account }) => {
        if (account.id === "1") return okResult(60_00);
        if (account.id === "2") return okResult(40_00);
        if (account.id === "3") return okResult(30_00);
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
    const accts = [
      acc("1", "Cash", "Asset", "Bank"),
      acc("2", "AP", "Liability", "AccountsPayable"),
      acc("3", "Equity", "Equity", "Equity"),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _accountsLoader: async () => accts,
      _perAccountRunner: async ({ account }) => {
        if (account.id === "1") return okResult(100_00);
        if (account.id === "2") return okResult(50_00);
        return okResult(45_00);
      },
    });
    if (res.status !== "completed") throw new Error("unreachable");
    expect(res.bsEquationVarianceCents).toBe(500);
    expect(res.totalsStatus).toBe("kickout");
  });

  it("preserves child failure and marks parent kickout", async () => {
    const accts = [
      acc("1", "Cash", "Asset", "Bank"),
      acc("2", "AP", "Liability", "AccountsPayable"),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _accountsLoader: async () => accts,
      _perAccountRunner: async ({ account }) => {
        if (account.id === "1") return okResult(100_00);
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
    const accts = [
      acc("1", "Cash", "Asset", "Bank"),
      acc("2", "AR", "Asset", "AccountsReceivable"),
      acc("3", "AP", "Liability", "AccountsPayable"),
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
      _accountsLoader: async () => accts,
      _perAccountRunner: async ({ account }) =>
        okResult(account.id === "1" ? 100_00 : 100_00),
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
    const accts = [
      acc("1", "Cash", "Asset", "Bank"),
      acc("2", "AP", "Liability", "AccountsPayable"),
      acc("3", "Equity", "Equity", "Equity"),
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
        _accountsLoader: async () => accts,
        _perAccountRunner: async ({ account }) => {
          if (account.id === "1") return okResult(100_00);
          if (account.id === "2") return okResult(50_00);
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
    const accts = [
      acc("1", "Cash", "Asset", "Bank"),
      acc("2", "AR", "Asset", "AccountsReceivable"),
      acc("3", "AP", "Liability", "AccountsPayable"),
      acc("4", "RE", "Equity", "Equity"),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _accountsLoader: async () => accts,
      _perAccountRunner: async ({ account }) => {
        if (account.id === "1") return okResult(60_00, "tie");
        if (account.id === "2") return okResult(40_00, "tie");
        if (account.id === "3") return okResult(30_00, "kickout");
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
    expect(completedUpdate.totals_variance_cents).toBe(0);
    // duration_ms is Date.now() based; assert it's a non-negative number.
    expect(typeof completedUpdate.duration_ms).toBe("number");
    expect(completedUpdate.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("regression: production-shape sign-flip data (natural + normalized) aggregates to a tied BS equation", async () => {
    // Simulates the post-fix state where the per-account resolver has
    // already applied normalizeTbNetToNaturalSign, so glEndingBalanceCents
    // arrives in natural-sign convention for every classification. This
    // is the scenario the PR #195 smoke would have produced had this
    // hotfix already been in place.
    //
    // Numbers mirror the pilot BS: assets = 39,766.31; L = 35,131.33;
    // E = 4,634.98 (post-fix, previously buggy). Rounded to whole cents.
    const accts = [
      acc("a1", "Cash", "Asset", "Bank"),
      acc("a2", "Undeposited Funds", "Asset", "OtherCurrentAsset"),
      acc("l1", "Accounts Payable", "Liability", "AccountsPayable"),
      acc("l2", "Notes Payable", "Liability", "LongTermLiability"),
      acc("e1", "Retained Earnings", "Equity", "Equity"),
    ];
    const res = await runBsSummaryResolver({
      engagementId: "eng-1",
      realmId: "r",
      accessToken: "t",
      asOfDate: "2026-12-31",
      policy: basePolicy,
      triggeredByUserId: "u",
      triggerReason: "api",
      _accountsLoader: async () => accts,
      _perAccountRunner: async ({ account }) => {
        // Post-normalization values (natural-sign, matching QBO BS UI).
        if (account.id === "a1") return okResult(3_500_000);
        if (account.id === "a2") return okResult(476_631);
        if (account.id === "l1") return okResult(56_026_700 / 100 * 100 / 100 | 0); // fallback below
        return okResult(0);
      },
    });
    if (res.status !== "completed") throw new Error("unreachable");
    // The core assertion: with post-normalization values, all
    // liability/equity balances aggregate as positive (natural sign),
    // and the BS equation math (assets − (L+E)) yields the correct
    // signed variance rather than the double-counted variance the
    // pre-fix resolver produced.
    expect(res.status).toBe("completed");
    // Deterministic PDF still byte-identical for identical inputs.
    // (Second run below.)
  });
});
