import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";
import type { JournalEntry } from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
import {
  WriteBoundaryDisabled,
  WriteRejected,
  WriteFailed,
  WriteDrifted,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  qboApiFetch: vi.fn(),
  resolveQBOTokenForFirmClient: vi.fn(),
  canPostToQBO: vi.fn(),
  resolveCurrencyForFirmClient: vi.fn(),
  resolveExchangeRate: vi.fn(),
  validateJEPayload: vi.fn(),
  resolveCompanyIdForUser: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));
vi.mock("@/lib/qbo/api-fetch.js", () => ({ qboApiFetch: mocks.qboApiFetch }));
vi.mock("@/lib/accounting/write-boundary/qbo-preflight", () => ({
  canPostToQBO: mocks.canPostToQBO,
  validateJEPayload: mocks.validateJEPayload,
  resolveCurrencyForFirmClient: mocks.resolveCurrencyForFirmClient,
  resolveExchangeRate: mocks.resolveExchangeRate,
  resolveQBOTokenForFirmClient: mocks.resolveQBOTokenForFirmClient,
}));
vi.mock("@/lib/integrations/accounting/resolve-company-id", () => ({
  resolveCompanyIdForUser: mocks.resolveCompanyIdForUser,
}));

import { QuickBooksWriteProvider } from "@/lib/integrations/quickbooks/accounting-provider";

const goodAccounts = [
  {
    connection_id: "conn-1",
    realm_id: "realm-1",
    account_id: "100",
    account_name: "Cash",
    fully_qualified_name: "Cash",
    account_type: "Income",
    account_sub_type: null,
    classification: "Revenue",
    active: true,
    currency_ref: "USD",
    parent_ref: null,
    meta_created_time: null,
    meta_last_updated_time: null,
    cached_at: "2026-08-08T00:00:00Z",
    raw_payload: {},
  },
  {
    connection_id: "conn-1",
    realm_id: "realm-1",
    account_id: "200",
    account_name: "Expense",
    fully_qualified_name: "Expense",
    account_type: "Expense",
    account_sub_type: null,
    classification: "Expense",
    active: true,
    currency_ref: "USD",
    parent_ref: null,
    meta_created_time: null,
    meta_last_updated_time: null,
    cached_at: "2026-08-08T00:00:00Z",
    raw_payload: {},
  },
];

type FakeOpts = {
  priorHit?: unknown;
  accounts?: unknown[];
  emitFail?: boolean;
};

function fakeSupabase(opts: FakeOpts = {}) {
  const accountRows = opts.accounts ?? goodAccounts;
  let emitSeq = 0;

  const lifecycleInsert = () => ({
    select: () => ({
      maybeSingle: async () =>
        opts.emitFail
          ? { data: null, error: { message: "emit boom" } }
          : { data: { id: `evt-${++emitSeq}` }, error: null },
    }),
  });

  const from = (table: string) => {
    if (table === "firm_clients") {
      return {
        select: () => ({
          eq: (_col: string, _val: string) => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { id: "fc-1", company_id: "co-1" },
                  error: null,
                }),
              }),
            }),
            maybeSingle: async () => ({
              data: { id: "fc-1", company_id: "co-1" },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "pilot_slots") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: { id: "slot-1" }, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "pilot_lifecycle_events") {
      return {
        insert: lifecycleInsert,
        select: () => ({
          in: () => ({
            filter: () => ({
              filter: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: opts.priorHit ?? null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "qbo_accounts_cache") {
      return {
        select: () => ({
          eq: () => ({
            // W1b validator / readQboAccounts: .eq("active", true) terminal
            eq: async () => ({ data: accountRows, error: null }),
            // W1c.4c preflight miss check: .in("account_id", ...)
            in: async () => ({
              data: (accountRows as typeof goodAccounts).map((r) => ({
                account_id: r.account_id,
                active: r.active,
              })),
              error: null,
            }),
            // W1c.4c preflight age check
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { cached_at: new Date().toISOString() },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unmocked table ${table}`);
  };

  return { from } as unknown as SupabaseClient;
}

function connection(
  overrides: Partial<AccountingConnectionRecord> = {},
): AccountingConnectionRecord {
  return {
    id: "conn-1",
    user_id: "user-1",
    provider: "quickbooks",
    provider_family: "intuit",
    provider_product: "qbo",
    external_entity_id: "realm-1",
    external_entity_name: "Sandbox",
    tenant_or_realm_id: "realm-1",
    scopes: [],
    status: "connected",
    metadata_json: {
      write_enabled_quickbooks: true,
      firm_client_id: "fc-1",
      pilot_slot_id: "slot-1",
    },
    ...overrides,
  };
}

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    tenantId: "realm-1",
    journalDate: "2026-08-08",
    narration: "W1c.2 test",
    currency: "USD",
    status: "POSTED",
    externalRef: "ext-w1c2-1",
    lines: [
      { accountCode: "100", debit: 50, credit: 0, description: "Dr" },
      { accountCode: "200", debit: 0, credit: 50, description: "Cr" },
    ],
    ...overrides,
  };
}

const tokenBundle = {
  realmId: "realm-1",
  accessToken: "tok",
  refreshToken: "ref",
  tokenSource: "accounting_connections" as const,
  grantedScopes: ["com.intuit.quickbooks.accounting"],
  connectionId: "conn-1",
  ownerUserId: "user-1",
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
};

function happyQboResponse(lineCount = 2) {
  const lines = Array.from({ length: lineCount }, (_, i) => ({
    DetailType: "JournalEntryLineDetail",
    Amount: 50,
    JournalEntryLineDetail: {
      PostingType: i === 0 ? "Debit" : "Credit",
      AccountRef: { value: i === 0 ? "100" : "200" },
    },
  }));
  return {
    ok: true,
    status: 200,
    json: {
      JournalEntry: {
        Id: "42",
        MetaData: { CreateTime: "2026-08-08T12:00:00.000Z" },
        Line: lines,
      },
    },
  };
}

describe("QuickBooksWriteProvider.writeJournalEntry", () => {
  const provider = new QuickBooksWriteProvider();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseAdmin.mockReturnValue(fakeSupabase());
    mocks.resolveCompanyIdForUser.mockResolvedValue("co-1");
    mocks.canPostToQBO.mockResolvedValue({
      canWrite: true,
      edition: "plus",
      subscriptionStatus: "subscribed",
    });
    mocks.resolveCurrencyForFirmClient.mockResolvedValue({
      ok: true,
      currency: "USD",
      home_currency: "USD",
      source: "explicit",
    });
    mocks.resolveQBOTokenForFirmClient.mockResolvedValue(tokenBundle);
    mocks.resolveExchangeRate.mockResolvedValue({
      ok: true,
      rate: 1,
      as_of_date: "2026-08-08",
    });
    mocks.validateJEPayload.mockResolvedValue({ valid: true });
    mocks.qboApiFetch.mockResolvedValue(happyQboResponse());
  });

  it("kill-switch disabled → WriteBoundaryDisabled, no emit", async () => {
    await expect(
      provider.writeJournalEntry(
        entry(),
        connection({ metadata_json: { write_enabled_quickbooks: false, firm_client_id: "fc-1" } }),
      ),
    ).rejects.toBeInstanceOf(WriteBoundaryDisabled);
    expect(mocks.canPostToQBO).not.toHaveBeenCalled();
    expect(mocks.qboApiFetch).not.toHaveBeenCalled();
  });

  it("W1b validator rejects → WriteRejected with 1 lifecycle id", async () => {
    mocks.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({
        priorHit: {
          id: "evt-prior",
          event_kind: "pilot.lifecycle.write-posted",
          chain_seq: 1,
          event_at: "2026-08-01T00:00:00Z",
        },
      }),
    );
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteRejected);
      expect((err as WriteRejected).lifecycleEventIds).toHaveLength(1);
      expect((err as WriteRejected).issues.some((i) => i.code === "duplicate-external-ref")).toBe(
        true,
      );
    }
    expect(mocks.qboApiFetch).not.toHaveBeenCalled();
  });

  it("Q7 preflight blocks → WriteRejected mentioning Q7 preflight blocked", async () => {
    mocks.canPostToQBO.mockResolvedValue({
      canWrite: false,
      reason: "subscription_read_only",
      edition: "plus",
      subscriptionStatus: "expired",
    });
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteRejected);
      expect((err as WriteRejected).issues[0]?.message).toContain("Q7 preflight blocked");
      expect((err as WriteRejected).lifecycleEventIds).toHaveLength(1);
    }
  });

  it("currency resolution fails → WriteRejected currency-mismatch", async () => {
    mocks.resolveCurrencyForFirmClient.mockResolvedValue({
      ok: false,
      reason: "home_currency_missing",
    });
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteRejected);
      expect((err as WriteRejected).issues[0]?.code).toBe("currency-mismatch");
    }
  });

  it("token missing → WriteFailed token_missing", async () => {
    mocks.resolveQBOTokenForFirmClient.mockResolvedValue(null);
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteFailed);
      expect((err as WriteFailed).providerErrorCode).toBe("token_missing");
    }
  });

  it("happy path → WriteReceipt with 2 lifecycle ids", async () => {
    const receipt = await provider.writeJournalEntry(entry(), connection());
    expect(receipt.providerJournalId).toBe("42");
    expect(receipt.status).toBe("POSTED");
    expect(receipt.lifecycleEventIds).toHaveLength(2);
    expect(receipt.resolvedAccounts).toHaveLength(2);
    expect(mocks.qboApiFetch).toHaveBeenCalledTimes(1);
  });

  it("401 then 200 after refresh → happy path", async () => {
    mocks.qboApiFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: {} })
      .mockResolvedValueOnce(happyQboResponse());
    mocks.resolveQBOTokenForFirmClient
      .mockResolvedValueOnce(tokenBundle)
      .mockResolvedValueOnce({ ...tokenBundle, accessToken: "tok2" });
    const receipt = await provider.writeJournalEntry(entry(), connection());
    expect(receipt.providerJournalId).toBe("42");
    expect(receipt.lifecycleEventIds).toHaveLength(2);
    expect(mocks.qboApiFetch).toHaveBeenCalledTimes(2);
  });

  it("QBO 500 → WriteFailed httpStatus 500 with 2 lifecycle ids", async () => {
    mocks.qboApiFetch.mockResolvedValue({ ok: false, status: 500, json: {} });
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteFailed);
      expect((err as WriteFailed).httpStatus).toBe(500);
      expect((err as WriteFailed).lifecycleEventIds).toHaveLength(2);
    }
  });

  it("drift detected → WriteDrifted + void call", async () => {
    mocks.qboApiFetch
      .mockResolvedValueOnce(happyQboResponse(1)) // POST JE: only 1 line → drift
      .mockResolvedValueOnce({
        // GET before void
        ok: true,
        status: 200,
        json: { JournalEntry: { Id: "42", SyncToken: "0" } },
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: { JournalEntry: { Id: "42" } } }); // void
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteDrifted);
      expect((err as WriteDrifted).driftReasons.length).toBeGreaterThan(0);
      expect((err as WriteDrifted).voidedJournalId).toBe("42");
      expect((err as WriteDrifted).lifecycleEventIds).toHaveLength(2);
    }
    expect(mocks.qboApiFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
