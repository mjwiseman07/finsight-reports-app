import { describe, expect, it } from "vitest";
import {
  buildDemoPackageSections,
  buildDemoBalanceSheetRows,
  buildDemoIncomeStatementRows,
  buildDemoFluxRows,
} from "@/lib/financial-package-pdf.demo-fixtures";

describe("Phase MC-2c — Financial Package PDF demo fixtures render in tenant currency", () => {
  it("buildDemoPackageSections renders CAD when currency=CAD", () => {
    const sections = buildDemoPackageSections("CAD");
    const flat = JSON.stringify(sections);
    expect(flat).toContain("CA$");
    // No bare USD-style "$182,000" tokens — CAD uses the CA$ prefix.
    expect(flat).not.toMatch(/"[^"]*[^A-Z]\$1[0-9][0-9],[0-9]{3}/);
    expect(flat).not.toContain('"$182,000"');
  });

  it("buildDemoPackageSections renders EUR when currency=EUR", () => {
    const sections = buildDemoPackageSections("EUR");
    const flat = JSON.stringify(sections);
    expect(flat).toMatch(/€|EUR/);
  });

  it("buildDemoPackageSections falls back to USD when currency=''", () => {
    const sections = buildDemoPackageSections("");
    const flat = JSON.stringify(sections);
    expect(flat).toContain("$182,000");
  });

  it("buildDemoBalanceSheetRows renders CAD when currency=CAD", () => {
    const rows = buildDemoBalanceSheetRows("CAD");
    const flat = JSON.stringify(rows);
    expect(flat).toContain("CA$");
  });

  it("buildDemoIncomeStatementRows renders CAD when currency=CAD", () => {
    const rows = buildDemoIncomeStatementRows("CAD");
    const flat = JSON.stringify(rows);
    expect(flat).toContain("CA$");
    expect(flat).toContain("CA$824,000");
  });

  it("buildDemoFluxRows renders CAD when currency=CAD, including the department-changes narrative", () => {
    const rows = buildDemoFluxRows("CAD");
    const payrollRow = rows.find((r) => r.account.includes("Payroll"))!;
    expect(payrollRow.current).toContain("CA$");
    expect(payrollRow.payrollFte?.departmentChanges).toContain("CA$5,689");
  });
});

describe("Phase MC-2c — regression: USD tenants unchanged", () => {
  it("USD demo package still renders bare '$' symbols on figures", () => {
    const sections = buildDemoPackageSections("USD");
    const flat = JSON.stringify(sections);
    expect(flat).toContain("$182,000");
    expect(flat).not.toContain("CA$");
    expect(flat).not.toContain("€");
  });
});
