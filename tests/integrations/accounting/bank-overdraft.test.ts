import { describe, expect, it } from "vitest";
import {
  isAssetSideBalanceSheetRow,
  isCashOrBankRelated,
  sumCashFromBalanceSheet,
} from "@/lib/integrations/accounting/active-report-summary";
import { applyCanonicalBankOverdraftClassification } from "@/lib/integrations/accounting/bank-overdraft";
import type { CanonicalBalanceSheetRow } from "@/lib/integrations/accounting/types";

function bs(
  label: string,
  amount: number,
  section: string,
  raw: Record<string, unknown> = {},
): CanonicalBalanceSheetRow {
  return {
    label,
    amount,
    section,
    source: {
      provider: "xero",
      providerFamily: "xero",
      providerProduct: "xero",
      sourceReport: "BalanceSheet",
      raw: {
        __advisacorHierarchyPath: [section, label],
        __advisacorSourceSection: section,
        rowType: "Row",
        ...raw,
      },
    },
  };
}

function liabilityCount(rows: CanonicalBalanceSheetRow[], label: string): number {
  return rows.filter(
    (row) =>
      row.label === label &&
      !isAssetSideBalanceSheetRow(row) &&
      /liabilit/i.test(
        `${row.section || ""} ${String((row.source?.raw as Record<string, unknown> | undefined)?.__advisacorSourceSection || "")}`,
      ),
  ).length;
}

function signedAssetTotal(rows: CanonicalBalanceSheetRow[]): number {
  return rows.filter((row) => isAssetSideBalanceSheetRow(row)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function signedLiabilityTotal(rows: CanonicalBalanceSheetRow[]): number {
  return rows
    .filter(
      (row) =>
        !isAssetSideBalanceSheetRow(row) &&
        /liabilit/i.test(
          `${row.section || ""} ${String((row.source?.raw as Record<string, unknown> | undefined)?.__advisacorSourceSection || "")}`,
        ),
    )
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

describe("applyCanonicalBankOverdraftClassification", () => {
  it("1: asset bank -4520.08 with no liability counterpart -> cash 0 / overdraft liability 4520.08", () => {
    const input = [
      bs("Checking Account", -4520.08, "Cash and Cash Equivalents"),
      bs("Total Cash and Cash Equivalents", -4520.08, "Cash and Cash Equivalents", { rowType: "SummaryRow" }),
      bs("Accounts Receivable", 8542.63, "Current Assets"),
    ];
    const out = applyCanonicalBankOverdraftClassification(input);
    expect(sumCashFromBalanceSheet(out)).toBe(0);
    expect(liabilityCount(out, "Checking Account")).toBe(1);
    const liability = out.find((row) => row.label === "Checking Account" && !isAssetSideBalanceSheetRow(row));
    expect(liability?.amount).toBe(4520.08);
  });

  it("2: asset bank -4520.08 + existing matching liability -> cash 0 / liability once", () => {
    const input = [
      bs("Checking Account", -4520.08, "Cash and Cash Equivalents"),
      bs("Checking Account", 4520.08, "Current Liabilities", {
        __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Checking Account"],
        __advisacorSourceSection: "Current Liabilities",
      }),
    ];
    const out = applyCanonicalBankOverdraftClassification(input);
    expect(sumCashFromBalanceSheet(out)).toBe(0);
    expect(liabilityCount(out, "Checking Account")).toBe(1);
    expect(out.filter((row) => row.label === "Checking Account")).toHaveLength(2);
  });

  it("3: positive bank 5000 -> cash 5000 / no overdraft", () => {
    const input = [bs("Checking Account", 5000, "Cash and Cash Equivalents")];
    const out = applyCanonicalBankOverdraftClassification(input);
    expect(sumCashFromBalanceSheet(out)).toBe(5000);
    expect(liabilityCount(out, "Checking Account")).toBe(0);
  });

  it("4: zero bank -> cash 0 / no overdraft", () => {
    const input = [bs("Checking Account", 0, "Cash and Cash Equivalents")];
    const out = applyCanonicalBankOverdraftClassification(input);
    expect(sumCashFromBalanceSheet(out)).toBe(0);
    expect(liabilityCount(out, "Checking Account")).toBe(0);
  });

  it("5: multiple positive banks + one overdraft", () => {
    const input = [
      bs("Operating Checking", 3000, "Bank Accounts"),
      bs("Savings", 2000, "Bank Accounts"),
      bs("Overdraft Checking", -4520.08, "Bank Accounts"),
    ];
    const out = applyCanonicalBankOverdraftClassification(input);
    expect(sumCashFromBalanceSheet(out)).toBe(5000);
    expect(liabilityCount(out, "Overdraft Checking")).toBe(1);
    expect(isCashOrBankRelated(out.find((r) => r.label === "Operating Checking")!)).toBe(true);
  });

  it("6: provenance/source amount remains -4520.08", () => {
    const input = [bs("Checking Account", -4520.08, "Cash and Cash Equivalents")];
    const out = applyCanonicalBankOverdraftClassification(input);
    const asset = out.find((row) => row.label === "Checking Account" && isAssetSideBalanceSheetRow(row));
    const liability = out.find((row) => row.label === "Checking Account" && !isAssetSideBalanceSheetRow(row));
    expect(asset?.amount).toBe(0);
    expect((asset?.source?.raw as Record<string, unknown>)?.__advisacorSourceAmount).toBe(-4520.08);
    expect((liability?.source?.raw as Record<string, unknown>)?.__advisacorSourceAmount).toBe(-4520.08);
  });

  it("7: BS equation remains valid after canonical presentation", () => {
    // Synthetic balanced sheet: AR 8542.63 + cash -4520.08 = 4022.55 assets;
    // AP 4022.55 liabilities. After reclass: AR 8542.63 + cash 0 = 8542.63;
    // AP 4022.55 + overdraft 4520.08 = 8542.63.
    const input = [
      bs("Accounts Receivable", 8542.63, "Current Assets"),
      bs("Checking Account", -4520.08, "Cash and Cash Equivalents"),
      bs("Accounts Payable", 4022.55, "Current Liabilities", {
        __advisacorHierarchyPath: ["Liabilities", "Current Liabilities", "Accounts Payable"],
        __advisacorSourceSection: "Current Liabilities",
      }),
    ];
    const beforeAssets = signedAssetTotal(input);
    const beforeLiab = signedLiabilityTotal(input);
    expect(beforeAssets).toBeCloseTo(beforeLiab, 2);

    const out = applyCanonicalBankOverdraftClassification(input);
    expect(signedAssetTotal(out)).toBeCloseTo(signedLiabilityTotal(out), 2);
    expect(sumCashFromBalanceSheet(out)).toBe(0);
    expect(liabilityCount(out, "Checking Account")).toBe(1);
  });
});
