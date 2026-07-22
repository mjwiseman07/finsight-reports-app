import { describe, expect, it } from "vitest";
import { parseQboGlDetailReport } from "../qbo-reports";

// Helper to build a hand-rolled QBO GL detail response with the Debit/Credit
// column layout the parser expects for BS accounts.
function makeReport(
  activityRows: Array<{
    date: string;
    type: string;
    doc?: string;
    name?: string;
    memo?: string;
    split?: string;
    debit?: string;
    credit?: string;
    balance?: string | null; // undefined = no cell present, null = empty string, string = literal value
  }>,
  beginningBalance?: string,
) {
  const cols = [
    { ColTitle: "Date" },
    { ColTitle: "Transaction Type" },
    { ColTitle: "Num" },
    { ColTitle: "Name" },
    { ColTitle: "Memo/Description" },
    { ColTitle: "Split" },
    { ColTitle: "Debit" },
    { ColTitle: "Credit" },
    { ColTitle: "Balance" },
  ];
  const dataRows: Array<{ type: string; ColData: Array<{ value?: string }> }> = [];
  if (beginningBalance !== undefined) {
    dataRows.push({
      type: "Data",
      ColData: [
        { value: "" },
        { value: "Beginning Balance" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: "" },
        { value: beginningBalance },
      ],
    });
  }
  for (const r of activityRows) {
    dataRows.push({
      type: "Data",
      ColData: [
        { value: r.date },
        { value: r.type },
        { value: r.doc ?? "" },
        { value: r.name ?? "" },
        { value: r.memo ?? "" },
        { value: r.split ?? "" },
        { value: r.debit ?? "" },
        { value: r.credit ?? "" },
        // Preserve the distinction: undefined = property omitted (empty cell),
        // null = empty string in the cell, string = literal value.
        ...(r.balance === undefined
          ? [{}]
          : r.balance === null
            ? [{ value: "" }]
            : [{ value: r.balance }]),
      ],
    });
  }
  return {
    Columns: { Column: cols },
    Rows: { Row: dataRows },
  };
}

describe("parseQboGlDetailReport", () => {
  it("returns the last non-null running balance when it is non-zero (regression: normal case)", () => {
    const report = makeReport(
      [
        { date: "2026-03-12", type: "Invoice", doc: "1001", debit: "100.00", balance: "100.00" },
        { date: "2026-03-20", type: "Invoice", doc: "1002", debit: "50.00", balance: "150.00" },
      ],
      "0.00",
    );
    const result = parseQboGlDetailReport(report);
    expect(result.beginningBalanceCents).toBe(0);
    expect(result.endingBalanceCents).toBe(15000);
    expect(result.activity).toHaveLength(2);
    expect(result.activity[0].runningBalanceCents).toBe(10000);
    expect(result.activity[1].runningBalanceCents).toBe(15000);
  });

  it("returns the last row's balance = 0 when the account paid down to zero (AZ Dept of Revenue fixture)", () => {
    // Reproduces the real-world 4B.3.3 smoke failure: AZ tax payable
    // accumulates $38.40 in March invoices, then is paid in full on 3/16.
    // Pre-fix, this returned 3840 because the `!== 0` filter rejected the
    // final running=0 row.
    const report = makeReport(
      [
        { date: "2026-03-12", type: "Invoice", doc: "1029", debit: "29.96", balance: "29.96" },
        { date: "2026-03-12", type: "Invoice", doc: "1029", debit: "8.44", balance: "38.40" },
        { date: "2026-03-16", type: "Sales Tax Payment", memo: "Q1 Payment", credit: "38.40", balance: "0.00" },
      ],
      "0.00",
    );
    const result = parseQboGlDetailReport(report);
    expect(result.beginningBalanceCents).toBe(0);
    expect(result.endingBalanceCents).toBe(0);
    expect(result.activity).toHaveLength(3);
    expect(result.activity[0].runningBalanceCents).toBe(2996);
    expect(result.activity[1].runningBalanceCents).toBe(3840);
    expect(result.activity[2].runningBalanceCents).toBe(0);
  });

  it("falls back to beginning + sum(netCents) when all Balance cells are empty", () => {
    const report = makeReport(
      [
        { date: "2026-03-12", type: "Invoice", doc: "1001", debit: "100.00", balance: null },
        { date: "2026-03-20", type: "Invoice", doc: "1002", debit: "50.00", balance: null },
      ],
      "25.00",
    );
    const result = parseQboGlDetailReport(report);
    expect(result.beginningBalanceCents).toBe(2500);
    // 2500 + 10000 + 5000 = 17500
    expect(result.endingBalanceCents).toBe(17500);
    expect(result.activity[0].runningBalanceCents).toBeNull();
    expect(result.activity[1].runningBalanceCents).toBeNull();
  });

  it("returns beginningBalanceCents when there is no activity", () => {
    const report = makeReport([], "42.50");
    const result = parseQboGlDetailReport(report);
    expect(result.beginningBalanceCents).toBe(4250);
    expect(result.endingBalanceCents).toBe(4250);
    expect(result.activity).toHaveLength(0);
  });

  it("distinguishes empty-string balance from literal '0.00' balance", () => {
    // Row A has an empty Balance cell (should NOT contribute to endingBalanceCents).
    // Row B has Balance = "0.00" (should be honored as the final ending balance).
    const report = makeReport(
      [
        { date: "2026-03-12", type: "Invoice", doc: "1001", debit: "100.00", balance: null },
        { date: "2026-03-20", type: "Payment", credit: "100.00", balance: "0.00" },
      ],
      "0.00",
    );
    const result = parseQboGlDetailReport(report);
    expect(result.endingBalanceCents).toBe(0);
    expect(result.activity[0].runningBalanceCents).toBeNull();
    expect(result.activity[1].runningBalanceCents).toBe(0);
  });

  it("skips 'Beginning Balance' and 'Total for' data rows during walking", () => {
    const report = {
      Columns: {
        Column: [
          { ColTitle: "Date" },
          { ColTitle: "Transaction Type" },
          { ColTitle: "Num" },
          { ColTitle: "Name" },
          { ColTitle: "Memo/Description" },
          { ColTitle: "Split" },
          { ColTitle: "Debit" },
          { ColTitle: "Credit" },
          { ColTitle: "Balance" },
        ],
      },
      Rows: {
        Row: [
          {
            type: "Data",
            ColData: [
              { value: "" },
              { value: "Beginning Balance" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "500.00" },
            ],
          },
          {
            type: "Data",
            ColData: [
              { value: "2026-03-12" },
              { value: "Invoice" },
              { value: "1001" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "100.00" },
              { value: "" },
              { value: "600.00" },
            ],
          },
          {
            type: "Data",
            ColData: [
              { value: "" },
              { value: "Total for Account" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "100.00" },
              { value: "" },
              { value: "600.00" },
            ],
          },
        ],
      },
    };
    const result = parseQboGlDetailReport(report);
    expect(result.beginningBalanceCents).toBe(50000);
    expect(result.endingBalanceCents).toBe(60000);
    // Only the real invoice row is captured; Beginning and Total rows are skipped.
    expect(result.activity).toHaveLength(1);
    expect(result.activity[0].txnType).toBe("Invoice");
    expect(result.activity[0].runningBalanceCents).toBe(60000);
  });
});
