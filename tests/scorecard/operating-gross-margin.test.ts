import { describe, expect, it } from "vitest";
import {
  factorizeOperatingGrossMargin,
  UNAVAILABLE_NO_GROSS_PROFIT_SUPPORT,
  UNAVAILABLE_NO_REVENUE,
} from "@/lib/scorecard/operating-gross-margin";
import { resolveNorthStar } from "@/lib/scorecard/industry-north-star";
import {
  isOperatingGrossMarginWired,
  resolveNorthStarTileState,
} from "@/components/dashboard/Scorecard";
import { factorizeNorthStar } from "@/lib/dashboard/accuracy-contract/kpi-factorization";
import {
  buildMappedFinancialSummary,
  hasCogsMappingEvidence,
  hasExplicitGrossProfitRow,
  isGrossProfitSupported,
} from "@/lib/integrations/accounting/normalizers/financial-statements";
import { buildActiveReportSummary } from "@/lib/integrations/accounting/active-report-summary";
import type {
  CanonicalBalanceSheetRow,
  CanonicalPnLRow,
  CanonicalSourceMetadata,
} from "@/lib/integrations/accounting/types";

const xeroSource = (raw: Record<string, unknown> = {}): CanonicalSourceMetadata => ({
  provider: "xero",
  providerFamily: "xero",
  providerProduct: "xero",
  sourceReport: "ProfitAndLoss",
  raw: {
    __advisacorHierarchyPath: ["ProfitAndLoss", "Income"],
    __advisacorSourceSection: "Income",
    ...raw,
  },
});

const qboSource = (): CanonicalSourceMetadata => ({
  provider: "quickbooks",
  providerFamily: "quickbooks",
  providerProduct: "quickbooks",
  sourceReport: "ProfitAndLoss",
  raw: {},
});

function pnl(
  label: string,
  amount: number,
  section: string,
  source: CanonicalSourceMetadata = xeroSource(),
): CanonicalPnLRow {
  return { label, amount, section, source };
}

function bs(
  label: string,
  amount: number,
  section: string,
  provider: "xero" | "quickbooks" = "xero",
): CanonicalBalanceSheetRow {
  return {
    label,
    amount,
    section,
    source: {
      provider,
      providerFamily: provider,
      providerProduct: provider,
      sourceReport: "BalanceSheet",
      raw: {
        __advisacorHierarchyPath: [section, label],
        __advisacorSourceSection: section,
      },
    },
  };
}

describe("factorizeOperatingGrossMargin", () => {
  it("1: explicit GP Revenue 100 / GP 60 -> 60.0% ready", () => {
    const factor = factorizeOperatingGrossMargin({
      revenue: 100,
      grossProfit: 60,
      grossProfitSupported: true,
    });
    expect(factor.status).toBe("ready");
    expect(factor.numeric).toBeCloseTo(0.6);
    expect(factor.display).toBe("60.0%");
  });

  it("2: explicit GP with true zero COGS -> 100.0% ready", () => {
    const factor = factorizeOperatingGrossMargin({
      revenue: 100,
      grossProfit: 100,
      grossProfitSupported: true,
    });
    expect(factor.status).toBe("ready");
    expect(factor.display).toBe("100.0%");
  });

  it("3: derived GP with mapped COGS evidence -> 60.0% ready", () => {
    const factor = factorizeOperatingGrossMargin({
      revenue: 100,
      grossProfit: 60,
      grossProfitSupported: true,
    });
    expect(factor.status).toBe("ready");
    expect(factor.display).toBe("60.0%");
  });

  it("4: no COGS + no explicit GP (numeric looks like 100) -> UNAVAILABLE not 100%", () => {
    const mapped = buildMappedFinancialSummary(
      [],
      [pnl("Total Income", 100, "Income"), pnl("Net Profit", 20, "Net Income")],
    );
    expect(mapped.revenue).toBe(100);
    expect(mapped.cogs).toBe(0);
    expect(mapped.grossProfit).toBe(100);
    expect(mapped.grossProfitSupported).toBe(false);
    const factor = factorizeOperatingGrossMargin(mapped);
    expect(factor.status).toBe("unavailable");
    expect(factor.display).toBeNull();
    expect(factor.message).toBe(UNAVAILABLE_NO_GROSS_PROFIT_SUPPORT);
  });

  it("5: missing summary -> unavailable, not fabricated", () => {
    expect(factorizeOperatingGrossMargin(null).status).toBe("unavailable");
    expect(factorizeOperatingGrossMargin(undefined).status).toBe("unavailable");
    expect(factorizeOperatingGrossMargin(null).message).toBe(UNAVAILABLE_NO_GROSS_PROFIT_SUPPORT);
  });

  it("6: revenue 0 -> unavailable with no-positive-revenue message", () => {
    const factor = factorizeOperatingGrossMargin({
      revenue: 0,
      grossProfit: 0,
      grossProfitSupported: true,
    });
    expect(factor.status).toBe("unavailable");
    expect(factor.message).toBe(UNAVAILABLE_NO_REVENUE);
  });

  it("7: negative revenue -> unavailable", () => {
    const factor = factorizeOperatingGrossMargin({
      revenue: -10,
      grossProfit: -5,
      grossProfitSupported: true,
    });
    expect(factor.status).toBe("unavailable");
    expect(factor.message).toBe(UNAVAILABLE_NO_REVENUE);
  });

  it("8: negative GP supported -> -20.0% ready", () => {
    const factor = factorizeOperatingGrossMargin({
      revenue: 100,
      grossProfit: -20,
      grossProfitSupported: true,
    });
    expect(factor.status).toBe("ready");
    expect(factor.display).toBe("-20.0%");
  });
});

describe("Gross Profit support evidence", () => {
  it("detects explicit GP and COGS evidence independently", () => {
    const withGp = [pnl("Total Income", 100, "Income"), pnl("Gross Profit", 100, "Income")];
    expect(hasExplicitGrossProfitRow(withGp)).toBe(true);
    expect(hasCogsMappingEvidence(withGp)).toBe(false);
    expect(isGrossProfitSupported(withGp)).toBe(true);

    const withCogs = [
      pnl("Total Income", 100, "Income"),
      pnl("Materials", 40, "Cost of Sales"),
      pnl("Total Cost of Sales", 40, "Cost of Sales"),
    ];
    expect(hasExplicitGrossProfitRow(withCogs)).toBe(false);
    expect(hasCogsMappingEvidence(withCogs)).toBe(true);
    expect(isGrossProfitSupported(withCogs)).toBe(true);

    const trueZeroCogs = [
      pnl("Total Income", 100, "Income"),
      pnl("Total Cost of Sales", 0, "Cost of Sales"),
      pnl("Gross Profit", 100, "Income"),
    ];
    expect(hasCogsMappingEvidence(trueZeroCogs)).toBe(true);
    expect(isGrossProfitSupported(trueZeroCogs)).toBe(true);
  });

  it("9: July Xero regression — explicit GP 9527.98 -> 100.0% ready", () => {
    const income = [
      pnl("Sales", 9527.98, "Income"),
      pnl("Total Income", 9527.98, "Income"),
      pnl("Gross Profit", 9527.98, "Income"),
      pnl("Total Expenses", 24163.13, "Expenses"),
      pnl("Net Profit", -14635.15, "Net Income"),
    ];
    const mapped = buildMappedFinancialSummary([], income);
    expect(mapped.revenue).toBe(9527.98);
    expect(mapped.grossProfit).toBe(9527.98);
    expect(mapped.grossProfitSupported).toBe(true);
    expect(hasExplicitGrossProfitRow(income)).toBe(true);
    expect(factorizeOperatingGrossMargin(mapped).display).toBe("100.0%");
  });

  it("10: QBO same canonical factorizer behavior", () => {
    const income = [
      pnl("Sales", 100, "Revenue", qboSource()),
      pnl("Total Income", 100, "Revenue", qboSource()),
      pnl("COGS", 40, "Cost of Sales", qboSource()),
      pnl("Total Cost of Sales", 40, "Cost of Sales", qboSource()),
      pnl("Net Income", 20, "Net Income", qboSource()),
    ];
    const mapped = buildMappedFinancialSummary([], income);
    expect(mapped.grossProfitSupported).toBe(true);
    expect(mapped.grossProfit).toBe(60);
    expect(factorizeOperatingGrossMargin(mapped).display).toBe("60.0%");

    const active = buildActiveReportSummary({
      reportDataContext: {
        normalizedData: {
          sourceSystem: "quickbooks",
          normalizedIncomeStatement: income,
          normalizedBalanceSheet: [bs("Checking", 0, "Current Assets", "quickbooks")],
        },
      },
    });
    expect(active?.grossProfitSupported).toBe(true);
    expect(factorizeOperatingGrossMargin(active!).display).toBe("60.0%");
  });
});

describe("General north-star wiring", () => {
  it("11: non-General north star still coming_soon", () => {
    const saas = resolveNorthStar("SaaS");
    expect(isOperatingGrossMarginWired(saas.code)).toBe(false);
    expect(
      resolveNorthStarTileState({
        computationShipped: saas.computationShipped,
        valueWired: isOperatingGrossMarginWired(saas.code),
        hasSummary: true,
        factorStatus: "ready",
      }).status,
    ).toBe("coming_soon");
  });

  it("General industry ready when supported factor exists", () => {
    const northStar = resolveNorthStar("General");
    expect(northStar.code).toBe("operating_gross_margin");
    expect(
      resolveNorthStarTileState({
        computationShipped: true,
        valueWired: true,
        hasSummary: true,
        factorStatus: "ready",
      }).status,
    ).toBe("ready");
  });
});

describe("Accuracy Contract provenance", () => {
  it("12: no fabricated QuickBooks pointer when provider/source absent", () => {
    const emptyPayload = factorizeNorthStar("General", {
      normalizedIncomeStatement: [
        { label: "Total Income", amount: 100, section: "Income" },
        { label: "Gross Profit", amount: 100, section: "Income" },
      ] as never,
      normalizedBalanceSheet: [],
    });
    // Option C: numeric may be ready from mapped labels, but no fabricated ERP pointers.
    expect(emptyPayload.formula).toBeNull();
    expect(emptyPayload.composition).toEqual([]);
    expect(JSON.stringify(emptyPayload)).not.toMatch(/"provider":"quickbooks"/);
    expect(JSON.stringify(emptyPayload)).not.toMatch(/externalRecordId":"grossProfit"/);
    expect(JSON.stringify(emptyPayload)).not.toMatch(/externalRecordId":"operating_gross_margin"/);

    const withLabels = [
      pnl("Total Income", 100, "Income"),
      pnl("Gross Profit", 60, "Income"),
    ];
    const withSource = factorizeNorthStar("General", {
      normalizedIncomeStatement: withLabels as never,
      normalizedBalanceSheet: [],
    });
    expect(withSource.computation_status).toBe("computed");
    expect(withSource.display).toBe("60.0%");
    expect(withSource.composition.every((c) => c.source.provider === "xero")).toBe(true);
  });

  it("13: derived KPI provenance uses truthful canonical source rows when present", () => {
    const income = [
      pnl("Total Income", 100, "Income"),
      pnl("Gross Profit", 60, "Income"),
      pnl("Net Profit", 20, "Net Income"),
    ];
    const result = factorizeNorthStar("General", {
      normalizedIncomeStatement: income as never,
      normalizedBalanceSheet: [],
    });
    expect(result.computation_status).toBe("computed");
    expect(result.display).toBe("60.0%");
    expect(result.formula?.kind).toBe("div");
    expect(result.composition).toHaveLength(2);
    expect(result.composition[0].source.provider).toBe("xero");
    expect(result.composition[0].label).toMatch(/gross profit/i);
    expect(result.reported_by_provider).toBe(60);

    const derivedOnly = factorizeNorthStar("General", {
      normalizedIncomeStatement: [
        pnl("Total Income", 100, "Income"),
        pnl("Materials", 40, "Cost of Sales"),
        pnl("Total Cost of Sales", 40, "Cost of Sales"),
        pnl("Net Profit", 20, "Net Income"),
      ] as never,
      normalizedBalanceSheet: [],
    });
    expect(derivedOnly.display).toBe("60.0%");
    // Derived path may omit formula; composition only includes actual ERP rows.
    expect(derivedOnly.composition.every((c) => c.source.provider === "xero")).toBe(true);
    expect(JSON.stringify(derivedOnly)).not.toMatch(/"provider":"quickbooks"/);
  });
});
