import { describe, expect, it } from "vitest";
import { DEFAULT_JE_PROPOSAL_POLICY, type JeProposalAccountMeta } from "../types";
import {
  assertTxnDateInPeriod,
  rejectControlAccounts,
  validateAndNormalizeLines,
  validateOriginClass,
  JeProposalValidationError,
} from "../validation";

const policy = DEFAULT_JE_PROPOSAL_POLICY;

function accounts(
  rows: Array<{ id: string; type: string; subtype?: string | null }>,
): Map<string, JeProposalAccountMeta> {
  const map = new Map<string, JeProposalAccountMeta>();
  for (const row of rows) {
    map.set(row.id, {
      accountId: row.id,
      accountType: row.type,
      accountSubtype: row.subtype ?? null,
      active: true,
    });
  }
  return map;
}

describe("JE double-entry validation", () => {
  it("accepts balanced cents", () => {
    const result = validateAndNormalizeLines(
      [
        { sequence: 1, accountId: "a", debitCents: 500, creditCents: 0 },
        { sequence: 2, accountId: "b", debitCents: 0, creditCents: 500 },
      ],
      policy,
    );
    expect(result.totalDebitsCents).toBe(500);
    expect(result.totalCreditsCents).toBe(500);
  });

  it("rejects unbalanced", () => {
    expect(() =>
      validateAndNormalizeLines(
        [
          { sequence: 1, accountId: "a", debitCents: 500, creditCents: 0 },
          { sequence: 2, accountId: "b", debitCents: 0, creditCents: 400 },
        ],
        policy,
      ),
    ).toThrow(JeProposalValidationError);
  });

  it("rejects negative debit", () => {
    expect(() =>
      validateAndNormalizeLines(
        [
          { sequence: 1, accountId: "a", debitCents: -1, creditCents: 0 },
          { sequence: 2, accountId: "b", debitCents: 0, creditCents: 1 },
        ],
        policy,
      ),
    ).toThrow(/negative/i);
  });

  it("rejects both sides on one line", () => {
    expect(() =>
      validateAndNormalizeLines(
        [
          { sequence: 1, accountId: "a", debitCents: 1, creditCents: 1 },
          { sequence: 2, accountId: "b", debitCents: 0, creditCents: 0 },
        ],
        policy,
      ),
    ).toThrow(/both debit and credit/i);
  });

  it("rejects both zero", () => {
    expect(() =>
      validateAndNormalizeLines(
        [
          { sequence: 1, accountId: "a", debitCents: 0, creditCents: 0 },
          { sequence: 2, accountId: "b", debitCents: 0, creditCents: 0 },
        ],
        policy,
      ),
    ).toThrow(/non-zero/i);
  });

  it("rejects non-integer cents", () => {
    expect(() =>
      validateAndNormalizeLines(
        [
          { sequence: 1, accountId: "a", debitCents: 1.5 as number, creditCents: 0 },
          { sequence: 2, accountId: "b", debitCents: 0, creditCents: 1.5 as number },
        ],
        policy,
      ),
    ).toThrow(/integer/i);
  });

  it("rejects empty / single line", () => {
    expect(() => validateAndNormalizeLines([], policy)).toThrow();
    expect(() =>
      validateAndNormalizeLines(
        [{ sequence: 1, accountId: "a", debitCents: 1, creditCents: 0 }],
        policy,
      ),
    ).toThrow(/two lines/i);
  });

  it("rejects non-contiguous sequence", () => {
    expect(() =>
      validateAndNormalizeLines(
        [
          { sequence: 1, accountId: "a", debitCents: 1, creditCents: 0 },
          { sequence: 3, accountId: "b", debitCents: 0, creditCents: 1 },
        ],
        policy,
      ),
    ).toThrow(/sequence/i);
  });
});

describe("JE control account bans", () => {
  const lines = [
    { sequence: 1, accountId: "x", debitCents: 100, creditCents: 0 },
    { sequence: 2, accountId: "y", debitCents: 0, creditCents: 100 },
  ];

  it("rejects configured AR control id", () => {
    expect(() =>
      rejectControlAccounts({
        lines: [
          { ...lines[0], accountId: "84" },
          { ...lines[1], accountId: "liab" },
        ],
        accounts: accounts([
          { id: "84", type: "Other Current Asset" },
          { id: "liab", type: "Other Current Liability" },
        ]),
        engagementControlAccountIds: { ar: "84", ap: null, inventory: null },
        policy,
      }),
    ).toThrow(/AR control/i);
  });

  it("rejects configured AP control id", () => {
    expect(() =>
      rejectControlAccounts({
        lines: [
          { ...lines[0], accountId: "exp" },
          { ...lines[1], accountId: "33" },
        ],
        accounts: accounts([
          { id: "exp", type: "Expense" },
          { id: "33", type: "Other Current Liability" },
        ]),
        engagementControlAccountIds: { ar: null, ap: "33", inventory: null },
        policy,
      }),
    ).toThrow(/AP control/i);
  });

  it("rejects configured Inventory control id", () => {
    expect(() =>
      rejectControlAccounts({
        lines: [
          { ...lines[0], accountId: "81" },
          { ...lines[1], accountId: "liab" },
        ],
        accounts: accounts([
          { id: "81", type: "Other Current Asset" },
          { id: "liab", type: "Other Current Liability" },
        ]),
        engagementControlAccountIds: { ar: null, ap: null, inventory: "81" },
        policy,
      }),
    ).toThrow(/Inventory control/i);
  });

  it("rejects QBO AccountsReceivable type", () => {
    expect(() =>
      rejectControlAccounts({
        lines: [
          { ...lines[0], accountId: "ar-type" },
          { ...lines[1], accountId: "liab" },
        ],
        accounts: accounts([
          { id: "ar-type", type: "AccountsReceivable" },
          { id: "liab", type: "Other Current Liability" },
        ]),
        engagementControlAccountIds: { ar: null, ap: null, inventory: null },
        policy,
      }),
    ).toThrow(/AccountsReceivable/i);
  });

  it("rejects QBO AccountsPayable type", () => {
    expect(() =>
      rejectControlAccounts({
        lines: [
          { ...lines[0], accountId: "exp" },
          { ...lines[1], accountId: "ap-type" },
        ],
        accounts: accounts([
          { id: "exp", type: "Expense" },
          { id: "ap-type", type: "AccountsPayable" },
        ]),
        engagementControlAccountIds: { ar: null, ap: null, inventory: null },
        policy,
      }),
    ).toThrow(/AccountsPayable/i);
  });

  it("rejects Inventory Asset subtype", () => {
    expect(() =>
      rejectControlAccounts({
        lines: [
          { ...lines[0], accountId: "inv" },
          { ...lines[1], accountId: "liab" },
        ],
        accounts: accounts([
          { id: "inv", type: "Other Current Asset", subtype: "Inventory" },
          { id: "liab", type: "Other Current Liability" },
        ]),
        engagementControlAccountIds: { ar: null, ap: null, inventory: null },
        policy,
      }),
    ).toThrow(/Inventory/i);
  });
});

describe("JE class + period", () => {
  it("accepts safe accrual", () => {
    expect(() =>
      validateOriginClass({
        originType: "ACCRUAL",
        lines: [
          { sequence: 1, accountId: "exp", debitCents: 1, creditCents: 0 },
          { sequence: 2, accountId: "liab", debitCents: 0, creditCents: 1 },
        ],
        accounts: accounts([
          { id: "exp", type: "Expense" },
          { id: "liab", type: "Other Current Liability" },
        ]),
        policy,
      }),
    ).not.toThrow();
  });

  it("accepts safe reclass P&L", () => {
    expect(() =>
      validateOriginClass({
        originType: "RECLASS",
        lines: [
          { sequence: 1, accountId: "e1", debitCents: 1, creditCents: 0 },
          { sequence: 2, accountId: "e2", debitCents: 0, creditCents: 1 },
        ],
        accounts: accounts([
          { id: "e1", type: "Expense" },
          { id: "e2", type: "Expense" },
        ]),
        policy,
      }),
    ).not.toThrow();
  });

  it("rejects cross-period txnDate", () => {
    expect(() =>
      assertTxnDateInPeriod({
        txnDate: "2026-08-01",
        periodEnd: "2026-07-31",
        periodStart: "2026-07-01",
        allowCrossPeriod: false,
      }),
    ).toThrow(/within the source/i);
  });
});
