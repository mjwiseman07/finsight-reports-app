import { describe, it, expect, vi, beforeEach } from "vitest";
import { TIE_OUT_KINDS } from "@/lib/audit-ready/tie-out-kind-classifier";

const mockAp = vi.fn();
const mockAr = vi.fn();
const mockInv = vi.fn();
const mockGrni = vi.fn();
const mockBs = vi.fn();
const mockFa = vi.fn();
const mockBsSummary = vi.fn();
const mockResolveFirm = vi.fn();
const mockResolveToken = vi.fn();
const mockFetchAccounts = vi.fn();

const originalRun = {
  id: "run-orig",
  engagement_id: "eng-1",
  pbc_request_id: "pbc-1",
  tie_out_kind: "ap_aging",
  period_end: "2026-06-30",
};

const eng = {
  id: "eng-1",
  firm_client_id: "fc-1",
  company_id: null,
  ar_control_qbo_account_id: "ar-1",
  ap_control_qbo_account_id: "ap-1",
  inventory_control_qbo_account_id: "inv-1",
  grni_clearing_qbo_account_id: null,
};

const policy = {
  policy_mode: "aggressive",
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 1,
  kickout_min_percent: 0.01,
  authoritative_comparison: "subledger_vs_gl",
};

let tables: Record<string, unknown> = {};

function makeChain(table: string) {
  const state: { filters: Array<[string, unknown]> } = { filters: [] };
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq(col: string, val: unknown) {
      state.filters.push([col, val]);
      return chain;
    },
    order() {
      return chain;
    },
    limit() {
      return chain;
    },
    async maybeSingle() {
      return { data: tables[table] ?? null, error: null };
    },
    async single() {
      return { data: tables[table] ?? null, error: null };
    },
  };
  return chain;
}

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({
  resolveQBOTokenForFirmClient: (...a: unknown[]) => mockResolveToken(...a),
}));

vi.mock("../../worker", () => ({
  resolveFirmClientIdForEngagement: (...a: unknown[]) => mockResolveFirm(...a),
}));

vi.mock("../../ap-resolver", () => ({
  runApResolver: (...a: unknown[]) => mockAp(...a),
}));
vi.mock("../../ar-resolver", () => ({
  runArResolver: (...a: unknown[]) => mockAr(...a),
}));
vi.mock("../../inventory-resolver", () => ({
  runInventoryResolver: (...a: unknown[]) => mockInv(...a),
}));
vi.mock("../../grni-resolver", () => ({
  runGrniResolver: (...a: unknown[]) => mockGrni(...a),
}));
vi.mock("../../bs-account-resolver", () => ({
  runBsAccountResolver: (...a: unknown[]) => mockBs(...a),
}));
vi.mock("../../fa-rollforward-resolver", () => ({
  runFaRollforwardResolver: (...a: unknown[]) => mockFa(...a),
}));
vi.mock("../../bs-summary-resolver", () => ({
  runBsSummaryResolver: (...a: unknown[]) => mockBsSummary(...a),
}));
vi.mock("../../qbo-reports", () => ({
  fetchQboAccountList: (...a: unknown[]) => mockFetchAccounts(...a),
}));
vi.mock("../../baseline-sync-custody", () => ({
  resolvePersistedAuthoritativeAccountingSyncId: async () => ({
    ok: true,
    accountingSyncId: "sync-regenerate-1",
    connectionId: "conn-1",
    lastSyncedAt: "2026-08-17T11:00:00.000Z",
    source: "pointer",
  }),
}));

import {
  getEmitter,
  SHIPPED_EMITTER_KINDS,
  regenerateRun,
} from "../registry";

const SHIPPED = [
  "bs_account_recon",
  "fixed_asset_rollforward",
  "bs_recon_summary",
  "ap_aging",
  "ar_aging",
  "inventory",
  "grni",
] as const;

beforeEach(() => {
  mockAp.mockReset();
  mockAr.mockReset();
  mockInv.mockReset();
  mockGrni.mockReset();
  mockBs.mockReset();
  mockFa.mockReset();
  mockBsSummary.mockReset();
  mockResolveFirm.mockReset();
  mockResolveToken.mockReset();
  mockFetchAccounts.mockReset();
  tables = {
    audit_ready_tie_out_runs: { ...originalRun },
    audit_ready_engagements: { ...eng },
    audit_ready_tie_out_policies: { ...policy },
  };
  mockResolveFirm.mockResolvedValue("fc-1");
  mockResolveToken.mockResolvedValue({
    accessToken: "tok",
    realmId: "realm-1",
  });
});

describe("EMITTER_REGISTRY", () => {
  it("resolves all 7 shipped kinds", () => {
    expect(SHIPPED_EMITTER_KINDS).toHaveLength(7);
    for (const kind of SHIPPED) {
      const emitter = getEmitter(kind);
      expect(emitter).not.toBeNull();
      expect(emitter!.kind).toBe(kind);
    }
  });

  it("returns null for the 7 unshipped kinds", () => {
    const unshipped = TIE_OUT_KINDS.filter(
      (k) => !(SHIPPED as readonly string[]).includes(k),
    );
    expect(unshipped).toHaveLength(7);
    for (const kind of unshipped) {
      expect(getEmitter(kind)).toBeNull();
    }
  });
});

describe("regenerateRun (via registry re-export)", () => {
  it("is exported as a function", () => {
    expect(typeof regenerateRun).toBe("function");
  });

  it("dispatches ap_aging with regenerated lineage fields", async () => {
    mockAp.mockResolvedValue({
      status: "completed",
      runId: "run-new",
      totalsStatus: "tie",
      itemCount: 1,
    });
    const res = await regenerateRun("run-orig", "user-1");
    expect(res).toEqual({ newRunId: "run-new" });
    expect(mockAp).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementId: "eng-1",
        pbcRequestId: "pbc-1",
        apAccountId: "ap-1",
        asOfDate: "2026-06-30",
        regeneratedFromRunId: "run-orig",
        triggerKind: "regenerated",
        triggeredByUserId: "user-1",
        triggerReason: "manual",
      }),
    );
  });

  it("throws regenerate_not_supported for unknown kinds", async () => {
    tables.audit_ready_tie_out_runs = {
      ...originalRun,
      tie_out_kind: "bank_recon",
    };
    await expect(regenerateRun("run-orig", "user-1")).rejects.toThrow(
      "regenerate_not_supported",
    );
  });

  it("throws when resolver status is failed", async () => {
    mockAp.mockResolvedValue({
      status: "failed",
      runId: "run-bad",
      errorCode: "qbo_error",
      errorMessage: "boom",
    });
    await expect(regenerateRun("run-orig", "user-1")).rejects.toThrow("boom");
  });

  it("dispatches bs_account_recon using artifact metadata + QBO classification", async () => {
    tables.audit_ready_tie_out_runs = {
      ...originalRun,
      tie_out_kind: "bs_account_recon",
    };
    tables.audit_ready_bs_recon_artifacts = {
      qbo_account_id: "acct-9",
      qbo_account_name: "Cash",
      qbo_account_type: "Bank",
      qbo_account_subtype: "Checking",
    };
    mockFetchAccounts.mockResolvedValue([
      {
        id: "acct-9",
        name: "Cash",
        accountType: "Bank",
        accountSubType: "Checking",
        classification: "Asset",
      },
    ]);
    mockBs.mockResolvedValue({
      status: "completed",
      runId: "run-bs-new",
      totalsStatus: "tie",
      itemCount: 3,
    });
    const res = await regenerateRun("run-orig", "user-1");
    expect(res.newRunId).toBe("run-bs-new");
    expect(mockBs).toHaveBeenCalledWith(
      expect.objectContaining({
        bsAccountId: "acct-9",
        classification: "Asset",
        regeneratedFromRunId: "run-orig",
        triggerKind: "regenerated",
      }),
    );
  });
});
