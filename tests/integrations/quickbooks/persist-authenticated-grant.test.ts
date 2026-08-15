/**
 * Authenticated QBO grant dual-write: legacy ERP + canonical accounting_connections.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getERPAdapter,
  supabaseAdmin,
  persistCanonicalAccountingConnectionGrant,
  resolveOrCreateCompanyForProvider,
} = vi.hoisted(() => ({
  getERPAdapter: vi.fn(),
  supabaseAdmin: { from: vi.fn() },
  persistCanonicalAccountingConnectionGrant: vi.fn(),
  resolveOrCreateCompanyForProvider: vi.fn(),
}));

vi.mock("@/lib/erp-adapters", () => ({ getERPAdapter }));
vi.mock("@/lib/supabase", () => ({ supabaseAdmin }));
vi.mock("@/lib/integrations/accounting/persist-canonical-connection-grant", () => ({
  persistCanonicalAccountingConnectionGrant,
}));
vi.mock("@/lib/integrations/accounting/resolve-or-create-company", () => ({
  resolveOrCreateCompanyForProvider,
}));
vi.mock("@/lib/erp/quickbooks/qbo-editions", () => ({
  parseOfferingSku: (v: unknown) => v || null,
  parseSubscriptionStatus: (v: unknown) => v || null,
}));

import { persistAuthenticatedQuickBooksGrant } from "@/lib/integrations/quickbooks/persist-authenticated-grant";

describe("persistAuthenticatedQuickBooksGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveOrCreateCompanyForProvider.mockResolvedValue("company-prod");
    persistCanonicalAccountingConnectionGrant.mockResolvedValue({
      connectionId: "acct-canonical-1",
      outcome: "inserted",
    });
    getERPAdapter.mockReturnValue({
      saveConnection: vi.fn().mockResolvedValue({ id: "erp-legacy-1" }),
    });
  });

  it("writes ERP then canonical and returns canonical connection id", async () => {
    const result = await persistAuthenticatedQuickBooksGrant({
      userId: "user-1",
      realmId: "9341454381415870",
      token: { access_token: "at", refresh_token: "rt", expires_in: 3600 },
      companyProfile: { legal_name: "Prod Co", home_currency: "USD" },
    });

    expect(result).toEqual({
      erpConnectionId: "erp-legacy-1",
      accountingConnectionId: "acct-canonical-1",
      companyId: "company-prod",
    });

    expect(getERPAdapter().saveConnection).toHaveBeenCalledWith({
      realmId: "9341454381415870",
      token: expect.objectContaining({ access_token: "at", refresh_token: "rt" }),
    });
    expect(persistCanonicalAccountingConnectionGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        provider: "quickbooks",
        tenantOrRealmId: "9341454381415870",
        companyId: "company-prod",
        status: "connected",
        metadataPatch: expect.objectContaining({
          oauth_mode: "user",
          legacy_erp_connection_id: "erp-legacy-1",
        }),
      }),
    );
  });

  it("does not swallow canonical persistence failures", async () => {
    persistCanonicalAccountingConnectionGrant.mockRejectedValue(new Error("canonical write failed"));
    await expect(
      persistAuthenticatedQuickBooksGrant({
        userId: "user-1",
        realmId: "9341454381415870",
        token: { access_token: "at", refresh_token: "rt" },
      }),
    ).rejects.toThrow("canonical write failed");
  });

  it("is realm-keyed (idempotent reconnect does not invent a second authority key)", async () => {
    persistCanonicalAccountingConnectionGrant.mockResolvedValue({
      connectionId: "acct-canonical-1",
      outcome: "updated_connected",
    });
    const result = await persistAuthenticatedQuickBooksGrant({
      userId: "user-1",
      realmId: "9341454381415870",
      token: { access_token: "at2", refresh_token: "rt2" },
    });
    expect(result.accountingConnectionId).toBe("acct-canonical-1");
    expect(persistCanonicalAccountingConnectionGrant.mock.calls[0][0].tenantOrRealmId).toBe(
      "9341454381415870",
    );
  });
});
