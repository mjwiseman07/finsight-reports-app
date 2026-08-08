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
  resolveCompanyIdForUser: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));
vi.mock("@/lib/integrations/accounting/resolve-company-id", () => ({
  resolveCompanyIdForUser: mocks.resolveCompanyIdForUser,
}));

import { XeroWriteProvider } from "@/lib/integrations/xero/accounting-provider";

const goodAccounts = [
  {
    connection_id: "conn-1",
    tenant_id: "tenant-1",
    account_id: "a1",
    account_code: "200",
    account_name: "Sales",
    account_type: "REVENUE",
    account_class: "REVENUE",
    system_account: null,
    status: "ACTIVE",
    enable_payments_to_account: false,
    tax_type: null,
    description: null,
    updated_date_utc: null,
    cached_at: "2026-08-08T00:00:00Z",
    raw_payload: {},
  },
  {
    connection_id: "conn-1",
    tenant_id: "tenant-1",
    account_id: "a2",
    account_code: "400",
    account_name: "Expense",
    account_type: "EXPENSE",
    account_class: "EXPENSE",
    system_account: null,
    status: "ACTIVE",
    enable_payments_to_account: false,
    tax_type: null,
    description: null,
    updated_date_utc: null,
    cached_at: "2026-08-08T00:00:00Z",
    raw_payload: {},
  },
];

function fakeSupabase(opts: { priorHit?: unknown } = {}) {
  let emitSeq = 0;
  const from = (table: string) => {
    if (table === "firm_clients") {
      return {
        select: () => ({
          eq: () => ({
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
        insert: () => ({
          select: () => ({
            maybeSingle: async () => ({ data: { id: `evt-${++emitSeq}` }, error: null }),
          }),
        }),
        select: () => ({
          in: () => ({
            filter: () => ({
              filter: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: opts.priorHit ?? null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "xero_accounts_cache") {
      return {
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: goodAccounts, error: null }),
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
    provider: "xero",
    provider_family: "xero",
    provider_product: "xero",
    external_entity_id: "xero:tenant-1",
    external_entity_name: "Demo",
    tenant_or_realm_id: "tenant-1",
    access_token: "xero-tok",
    scopes: [],
    status: "connected",
    metadata_json: {
      write_enabled_xero: true,
      firm_client_id: "fc-1",
      pilot_slot_id: "slot-1",
    },
    ...overrides,
  };
}

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    tenantId: "tenant-1",
    journalDate: "2026-08-08",
    narration: "Xero W1c.2",
    currency: "USD",
    status: "DRAFT",
    externalRef: "ext-xero-1",
    lines: [
      { accountCode: "200", debit: 100, credit: 0 },
      { accountCode: "400", debit: 0, credit: 100 },
    ],
    ...overrides,
  };
}

function happyXeroBody(lineCount = 2) {
  const JournalLines = Array.from({ length: lineCount }, (_, i) => ({
    AccountCode: i === 0 ? "200" : "400",
    AccountID: i === 0 ? "a1" : "a2",
    LineAmount: i === 0 ? 100 : -100,
  }));
  return {
    ManualJournals: [
      {
        ManualJournalID: "mj-1",
        JournalNumber: "MJ-9",
        Status: "DRAFT",
        UpdatedDateUTC: "2026-08-08T12:00:00.000Z",
        JournalLines,
        Warnings: [],
      },
    ],
  };
}

describe("XeroWriteProvider.writeJournalEntry", () => {
  const provider = new XeroWriteProvider();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseAdmin.mockReturnValue(fakeSupabase());
    mocks.resolveCompanyIdForUser.mockResolvedValue("co-1");
    vi.stubGlobal(
      "fetch",
      mocks.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => happyXeroBody(),
      }),
    );
  });

  it("kill-switch disabled → WriteBoundaryDisabled", async () => {
    await expect(
      provider.writeJournalEntry(
        entry(),
        connection({ metadata_json: { write_enabled_xero: false } }),
      ),
    ).rejects.toBeInstanceOf(WriteBoundaryDisabled);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("W1b validator rejects → WriteRejected", async () => {
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
    await expect(provider.writeJournalEntry(entry(), connection())).rejects.toBeInstanceOf(
      WriteRejected,
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("Xero 400 → WriteFailed httpStatus 400", async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ Message: "bad" }),
    });
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteFailed);
      expect((err as WriteFailed).httpStatus).toBe(400);
    }
  });

  it("happy path → WriteReceipt with 2 lifecycle ids", async () => {
    const receipt = await provider.writeJournalEntry(entry(), connection());
    expect(receipt.providerJournalId).toBe("mj-1");
    expect(receipt.status).toBe("DRAFT");
    expect(receipt.lifecycleEventIds).toHaveLength(2);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("drift detected → WriteDrifted + void PUT", async () => {
    mocks.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => happyXeroBody(1),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ManualJournals: [{ ManualJournalID: "mj-1", Status: "VOIDED" }] }),
      });
    try {
      await provider.writeJournalEntry(entry(), connection());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WriteDrifted);
      expect((err as WriteDrifted).voidedJournalId).toBe("mj-1");
      expect((err as WriteDrifted).lifecycleEventIds).toHaveLength(2);
    }
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
