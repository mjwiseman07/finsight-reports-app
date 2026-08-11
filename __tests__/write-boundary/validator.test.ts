import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateJournalEntry } from "@/lib/accounting/write-boundary/validator";
import type { JournalEntry } from "@/lib/accounting/write-boundary/types";
import type { WriteBoundaryConnection } from "@/lib/accounting/write-boundary/types";

// Fake admin client: returns whatever the test sets on __xero / __qbo.
function fakeAdmin(opts: {
  xeroAccounts?: unknown[];
  qboAccounts?: unknown[];
  priorHit?: unknown;
} = {}) {
  const from = vi.fn((table: string) => {
    if (table === "xero_accounts_cache") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: opts.xeroAccounts ?? [], error: null }),
          }),
        }),
      };
    }
    if (table === "qbo_accounts_cache") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: opts.qboAccounts ?? [], error: null }),
          }),
        }),
      };
    }
    if (table === "pilot_lifecycle_events") {
      return {
        select: () => ({
          in: () => ({
            filter: () => ({
              filter: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: opts.priorHit ?? null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from } as unknown as SupabaseClient;
}

const conn = (overrides: Partial<WriteBoundaryConnection> = {}): WriteBoundaryConnection => ({
  id: "c1",
  provider: "xero",
  tenant_or_realm_id: "t1",
  status: "connected",
  metadata_json: { write_enabled_xero: true },
  home_currency: "USD",
  ...overrides,
});

const entry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  tenantId: "t1",
  journalDate: "2026-08-08",
  narration: "Test entry",
  currency: "USD",
  status: "DRAFT",
  externalRef: "ext-1",
  lines: [
    { accountCode: "200", debit: 100, credit: 0 },
    { accountCode: "400", debit: 0, credit: 100 },
  ],
  ...overrides,
});

const goodXeroAccounts = [
  {
    connection_id: "c1", tenant_id: "t1", account_id: "a1",
    account_code: "200", account_name: "Sales", account_type: "REVENUE",
    account_class: "REVENUE", system_account: null, status: "ACTIVE",
    enable_payments_to_account: false, tax_type: null, description: null,
    updated_date_utc: null, cached_at: "2026-08-08T00:00:00Z", raw_payload: {},
  },
  {
    connection_id: "c1", tenant_id: "t1", account_id: "a2",
    account_code: "400", account_name: "Cost of Sales", account_type: "EXPENSE",
    account_class: "EXPENSE", system_account: null, status: "ACTIVE",
    enable_payments_to_account: false, tax_type: null, description: null,
    updated_date_utc: null, cached_at: "2026-08-08T00:00:00Z", raw_payload: {},
  },
];

describe("validateJournalEntry — happy path", () => {
  test("valid balanced entry returns valid=true", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry(),
      conn(),
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});

describe("validateJournalEntry — structural rejections", () => {
  test("missing narration", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({ narration: "" }),
      conn(),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "missing-narration")).toBe(true);
  });

  test("bad date format", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({ journalDate: "08/08/2026" }),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "invalid-date")).toBe(true);
  });

  test("single line entry", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({ lines: [{ accountCode: "200", debit: 100, credit: 0 }] }),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "insufficient-lines")).toBe(true);
  });

  test("unbalanced entry", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({
        lines: [
          { accountCode: "200", debit: 100, credit: 0 },
          { accountCode: "400", debit: 0, credit: 99 },
        ],
      }),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "unbalanced-lines")).toBe(true);
  });

  test("tolerates 1-cent float rounding", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({
        lines: [
          { accountCode: "200", debit: 100.005, credit: 0 },
          { accountCode: "400", debit: 0, credit: 100 },
        ],
      }),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "unbalanced-lines")).toBe(false);
  });

  test("line with both debit and credit", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({
        lines: [
          { accountCode: "200", debit: 100, credit: 100 },
          { accountCode: "400", debit: 0, credit: 100 },
        ],
      }),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "zero-amount-line")).toBe(true);
  });

  test("negative amount", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({
        lines: [
          { accountCode: "200", debit: -100, credit: 0 },
          { accountCode: "400", debit: 0, credit: -100 },
        ],
      }),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "zero-amount-line")).toBe(true);
  });

  test("tenantId mismatch", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({ tenantId: "different-tenant" }),
      conn(),
    );
    expect(result.issues.some((i) => i.message.includes("tenantId"))).toBe(true);
  });

  test("currency mismatch with home_currency", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: goodXeroAccounts }),
      entry({ currency: "EUR" }),
      conn({ home_currency: "USD" }),
    );
    expect(result.issues.some((i) => i.code === "currency-mismatch")).toBe(true);
  });
});

describe("validateJournalEntry — account-existence + forbidden", () => {
  test("unknown Xero account code", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: [goodXeroAccounts[0]] }), // only "200" cached
      entry(),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "unknown-account-code" && i.accountCode === "400")).toBe(true);
  });

  test("Xero forbidden SystemAccount (RETAINEDEARNINGS)", async () => {
    const withForbidden = [
      goodXeroAccounts[0],
      { ...goodXeroAccounts[1], system_account: "RETAINEDEARNINGS", account_code: "400" },
    ];
    const result = await validateJournalEntry(
      fakeAdmin({ xeroAccounts: withForbidden }),
      entry(),
      conn(),
    );
    expect(result.issues.some((i) => i.code === "forbidden-account")).toBe(true);
  });

  test("QBO uses accountCode as Id lookup", async () => {
    const qboAccounts = [
      {
        connection_id: "c1", realm_id: "r1", account_id: "42",
        account_name: "Sales", fully_qualified_name: "Sales",
        account_type: "Income", account_sub_type: null, classification: "Revenue",
        active: true, currency_ref: "USD", parent_ref: null,
        meta_created_time: null, meta_last_updated_time: null,
        cached_at: "2026-08-08T00:00:00Z", raw_payload: {},
      },
      {
        connection_id: "c1", realm_id: "r1", account_id: "84",
        account_name: "Expense", fully_qualified_name: "Expense",
        account_type: "Expense", account_sub_type: null, classification: "Expense",
        active: true, currency_ref: "USD", parent_ref: null,
        meta_created_time: null, meta_last_updated_time: null,
        cached_at: "2026-08-08T00:00:00Z", raw_payload: {},
      },
    ];
    const result = await validateJournalEntry(
      fakeAdmin({ qboAccounts }),
      entry({
        lines: [
          { accountCode: "42", debit: 0, credit: 100 },
          { accountCode: "84", debit: 100, credit: 0 },
        ],
      }),
      conn({ provider: "quickbooks" }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("validateJournalEntry — idempotency", () => {
  test("prior write with same externalRef rejects as duplicate", async () => {
    const result = await validateJournalEntry(
      fakeAdmin({
        xeroAccounts: goodXeroAccounts,
        priorHit: {
          id: "evt-prior",
          event_kind: "pilot.lifecycle.write-posted",
          chain_seq: 100,
          event_at: "2026-08-07T00:00:00Z",
          payload: {},
        },
      }),
      entry(),
      conn(),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "duplicate-external-ref")).toBe(true);
    expect(result.issues.some((i) => i.message.includes("evt-prior"))).toBe(true);
  });
});
