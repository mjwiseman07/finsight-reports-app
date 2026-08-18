import { describe, it, expect, vi, beforeEach } from "vitest";

const mockBs = vi.fn();
const mockResolveFirm = vi.fn();
const mockResolveToken = vi.fn();
const mockFetchAccounts = vi.fn();

const originalRun = {
  id: "run-orig",
  engagement_id: "eng-1",
  pbc_request_id: "pbc-1",
  tie_out_kind: "bs_account_recon",
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

const fromTables: string[] = [];
let tables: Record<string, unknown> = {};

function makeChain(table: string) {
  fromTables.push(table);
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq() {
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

vi.mock("../worker", () => ({
  resolveFirmClientIdForEngagement: (...a: unknown[]) => mockResolveFirm(...a),
}));

vi.mock("../ap-resolver", () => ({
  runApResolver: vi.fn(),
}));
vi.mock("../ar-resolver", () => ({
  runArResolver: vi.fn(),
}));
vi.mock("../inventory-resolver", () => ({
  runInventoryResolver: vi.fn(),
}));
vi.mock("../grni-resolver", () => ({
  runGrniResolver: vi.fn(),
}));
vi.mock("../bs-account-resolver", () => ({
  runBsAccountResolver: (...a: unknown[]) => mockBs(...a),
}));
vi.mock("../fa-rollforward-resolver", () => ({
  runFaRollforwardResolver: vi.fn(),
}));
vi.mock("../bs-summary-resolver", () => ({
  runBsSummaryResolver: vi.fn(),
}));
vi.mock("../qbo-reports", () => ({
  fetchQboAccountList: (...a: unknown[]) => mockFetchAccounts(...a),
}));
vi.mock("../baseline-sync-custody", () => ({
  resolvePersistedAuthoritativeAccountingSyncId: async () => ({
    ok: true,
    accountingSyncId: "sync-regenerate-1",
    connectionId: "conn-1",
    lastSyncedAt: "2026-08-17T11:00:00.000Z",
    source: "pointer",
  }),
}));

import { regenerateRun } from "../regenerate-run";

beforeEach(() => {
  mockBs.mockReset();
  mockResolveFirm.mockReset();
  mockResolveToken.mockReset();
  mockFetchAccounts.mockReset();
  fromTables.length = 0;
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
});

describe("regenerateRun bs_account_recon account meta", () => {
  describe("canonical path", () => {
    it("prefers variances totals.entity_qbo_id over legacy artifact", async () => {
      tables.audit_ready_tie_out_variances = {
        entity_qbo_id: "acct-9",
        entity_display_name: "Cash from variance",
      };
      tables.audit_ready_bs_recon_artifacts = {
        qbo_account_id: "acct-LEGACY",
        qbo_account_name: "Legacy Cash",
        qbo_account_type: "Bank",
        qbo_account_subtype: "Checking",
      };

      const res = await regenerateRun("run-orig", "user-1");
      expect(res.newRunId).toBe("run-bs-new");
      expect(fromTables).toContain("audit_ready_tie_out_variances");
      expect(fromTables).not.toContain("audit_ready_bs_recon_artifacts");
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

  describe("legacy fallback", () => {
    it("falls back to bs_recon_artifacts when variances lack entity_qbo_id", async () => {
      tables.audit_ready_tie_out_variances = {
        entity_qbo_id: null,
        entity_display_name: null,
      };
      tables.audit_ready_bs_recon_artifacts = {
        qbo_account_id: "acct-9",
        qbo_account_name: "Cash",
        qbo_account_type: "Bank",
        qbo_account_subtype: "Checking",
      };

      const res = await regenerateRun("run-orig", "user-1");
      expect(res.newRunId).toBe("run-bs-new");
      expect(fromTables).toContain("audit_ready_bs_recon_artifacts");
      expect(mockBs).toHaveBeenCalledWith(
        expect.objectContaining({
          bsAccountId: "acct-9",
          classification: "Asset",
        }),
      );
    });

    it("throws bs_artifact_not_found when both paths lack account id", async () => {
      tables.audit_ready_tie_out_variances = null;
      tables.audit_ready_bs_recon_artifacts = null;
      await expect(regenerateRun("run-orig", "user-1")).rejects.toThrow(
        "bs_artifact_not_found",
      );
    });
  });

  describe("byte-identity", () => {
    it("dispatches identical resolver args from canonical vs fallback given identical account", async () => {
      tables.audit_ready_tie_out_variances = {
        entity_qbo_id: "acct-9",
        entity_display_name: "Cash",
      };
      await regenerateRun("run-orig", "user-1");
      const canonicalArgs = { ...mockBs.mock.calls[0]![0] };

      mockBs.mockClear();
      fromTables.length = 0;
      tables.audit_ready_tie_out_variances = {
        entity_qbo_id: null,
        entity_display_name: null,
      };
      tables.audit_ready_bs_recon_artifacts = {
        qbo_account_id: "acct-9",
        qbo_account_name: "Cash",
        qbo_account_type: "Bank",
        qbo_account_subtype: "Checking",
      };
      await regenerateRun("run-orig", "user-1");
      const fallbackArgs = { ...mockBs.mock.calls[0]![0] };

      expect(canonicalArgs).toEqual(fallbackArgs);
    });
  });
});
