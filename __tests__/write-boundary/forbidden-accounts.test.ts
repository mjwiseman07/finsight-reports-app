import { describe, test, expect } from "vitest";
import {
  isForbiddenXeroAccount,
  isForbiddenQboAccount,
  forbiddenRulesSnapshot,
} from "@/lib/accounting/write-boundary/forbidden-accounts";
import type {
  XeroAccountSnapshot,
  QboAccountSnapshot,
} from "@/lib/accounting/write-boundary/types";

const xero = (overrides: Partial<XeroAccountSnapshot> = {}): XeroAccountSnapshot => ({
  connection_id: "c1",
  tenant_id: "t1",
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
  ...overrides,
});

const qbo = (overrides: Partial<QboAccountSnapshot> = {}): QboAccountSnapshot => ({
  connection_id: "c1",
  realm_id: "r1",
  account_id: "42",
  account_name: "Sales of Product Income",
  fully_qualified_name: "Sales of Product Income",
  account_type: "Income",
  account_sub_type: "SalesOfProductIncome",
  classification: "Revenue",
  active: true,
  currency_ref: "USD",
  parent_ref: null,
  meta_created_time: null,
  meta_last_updated_time: null,
  cached_at: "2026-08-08T00:00:00Z",
  raw_payload: {},
  ...overrides,
});

describe("isForbiddenXeroAccount", () => {
  test.each([
    ["BANK", "any", true],
    ["REVENUE", "any", false],
    ["EXPENSE", null, false],
  ])("account_type=%s -> forbidden=%s", (type, _sysAcct, expected) => {
    const result = isForbiddenXeroAccount(xero({ account_type: type }));
    expect(result.forbidden).toBe(expected);
  });

  test.each([
    "DEBTORS",
    "CREDITORS",
    "RETAINEDEARNINGS",
    "SALESTAXPAYABLE",
    "SALESTAXRECEIVABLE",
    "UNPAIDEXPCLM",
    "HISTADJUSTMENT",
    "GST",
    "GSTONIMPORTS",
  ])("SystemAccount=%s is forbidden", (sysAcct) => {
    const result = isForbiddenXeroAccount(xero({ system_account: sysAcct, account_type: "REVENUE" }));
    expect(result.forbidden).toBe(true);
    expect(result.reasonCode).toBe("forbidden-system-account");
  });

  test("RETAINEDEARNINGS reference in detail includes W0.5 finding citation", () => {
    const result = isForbiddenXeroAccount(xero({ system_account: "RETAINEDEARNINGS", account_type: "EQUITY" }));
    expect(result.detail).toContain("W0.5");
  });
});

describe("isForbiddenQboAccount", () => {
  test.each([
    ["Bank", true],
    ["Accounts Receivable", true],
    ["Accounts Payable", true],
    ["Credit Card", true],
    ["Income", false],
    ["Expense", false],
    ["Other Current Asset", false],
  ])("AccountType=%s -> forbidden=%s", (type, expected) => {
    expect(isForbiddenQboAccount(qbo({ account_type: type })).forbidden).toBe(expected);
  });

  test.each(["OpeningBalanceEquity", "RetainedEarnings", "UndepositedFunds"])(
    "AccountSubType=%s is forbidden",
    (sub) => {
      expect(isForbiddenQboAccount(qbo({ account_type: "Equity", account_sub_type: sub })).forbidden).toBe(true);
    },
  );
});

describe("forbiddenRulesSnapshot", () => {
  test("returns stable, alphabetized snapshot for PARITY doc regression", () => {
    const snap = forbiddenRulesSnapshot();
    // Xero — asserts the rules haven't been quietly widened without a PARITY update
    expect(snap.xero.types).toEqual(["BANK"]);
    expect(snap.xero.system_accounts).toEqual([
      "CREDITORS",
      "DEBTORS",
      "GST",
      "GSTONIMPORTS",
      "HISTADJUSTMENT",
      "RETAINEDEARNINGS",
      "SALESTAXPAYABLE",
      "SALESTAXRECEIVABLE",
      "UNPAIDEXPCLM",
    ]);
    // QBO
    expect(snap.qbo.types).toEqual(["Accounts Payable", "Accounts Receivable", "Bank", "Credit Card"]);
    expect(snap.qbo.sub_types).toEqual(["OpeningBalanceEquity", "RetainedEarnings", "UndepositedFunds"]);
  });
});
