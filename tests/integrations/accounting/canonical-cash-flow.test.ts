import { describe, expect, it } from "vitest";
import {
  assertNotBankSummaryCashFlowSource,
  BANK_SUMMARY_FORBIDDEN_AS_CASH_FLOW,
  buildCanonicalCashFlowScheduleFromProviderRows,
  buildNotSupportedCashFlowSchedule,
  scorecardNetOperatingCashFlow,
  toScorecardCashFlowTrailing,
  XERO_CASH_FLOW_CUSTOMER_MESSAGE,
  XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON,
  xeroCashFlowCapability,
} from "@/lib/integrations/accounting/cash-flow";
import { trailingTwelveMonthPeriod } from "@/lib/integrations/accounting/report-period";
import { buildAdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/advisacor-data-model";
import { ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION } from "@/lib/integrations/accounting/payload-schema";
import { emptyReportBundle } from "@/lib/integrations/accounting/normalizers/reports";
import { factorizeNetOpCashFlow } from "@/lib/dashboard/accuracy-contract/kpi-factorization";
import type { CanonicalCashFlowRow, CanonicalSourceMetadata } from "@/lib/integrations/accounting/types";
import { resolveNetOpCashFlowTileState } from "@/components/dashboard/Scorecard";

function cfSource(label: string, overrides: Partial<CanonicalSourceMetadata> = {}): CanonicalSourceMetadata {
  return {
    provider: "quickbooks",
    providerFamily: "quickbooks",
    providerProduct: "quickbooks",
    sourceReport: "CashFlow",
    externalEntityId: "realm-1",
    externalRecordId: `qbo-cf:${label}`,
    raw: {
      __advisacorHierarchyPath: ["Operating Activities", label],
      __advisacorSourceSection: "Operating Activities",
    },
    ...overrides,
  };
}

function cfRow(label: string, amount: number, section = "Operating Activities"): CanonicalCashFlowRow {
  return {
    label,
    amount,
    section,
    source: cfSource(label, {
      raw: {
        __advisacorHierarchyPath: [section, label],
        __advisacorSourceSection: section,
      },
    }),
  };
}

describe("trailingTwelveMonthPeriod", () => {
  it("1: 2026-07-31 → 2025-08-01 through 2026-07-31", () => {
    expect(trailingTwelveMonthPeriod("2026-07-31")).toEqual({
      startDate: "2025-08-01",
      endDate: "2026-07-31",
    });
  });

  it("year boundary: 2026-01-31 → 2025-02-01 through 2026-01-31", () => {
    expect(trailingTwelveMonthPeriod("2026-01-31")).toEqual({
      startDate: "2025-02-01",
      endDate: "2026-01-31",
    });
  });

  it("leap year end: 2024-02-29 → 2023-03-01 through 2024-02-29", () => {
    expect(trailingTwelveMonthPeriod("2024-02-29")).toEqual({
      startDate: "2023-03-01",
      endDate: "2024-02-29",
    });
  });
});

describe("canonical cash flow from QBO SoCF rows", () => {
  it("2/3: creates schedule and extracts operating subtotal", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      rows: [
        cfRow("Net Income", 1000),
        cfRow("Depreciation", 200),
        cfRow("Net cash provided by operating activities", 1200),
        cfRow("Net cash used in investing activities", -400, "Investing Activities"),
        cfRow("Net cash provided by financing activities", 50, "Financing Activities"),
      ],
    });
    expect(schedule.supportStatus).toBe("supported");
    expect(schedule.sourceKind).toBe("provider_statement_of_cash_flows");
    expect(schedule.startDate).toBe("2025-08-01");
    expect(schedule.endDate).toBe("2026-07-31");
    expect(schedule.netOperatingCashFlow).toBe(1200);
    expect(schedule.netInvestingCashFlow).toBe(-400);
    expect(schedule.netFinancingCashFlow).toBe(50);
    expect(schedule.provenance.operatingSubtotalLabel).toMatch(/operating/i);
  });

  it("4: positive NOCF preserved", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      rows: [cfRow("Net cash provided by operating activities", 9876.54)],
    });
    expect(schedule.netOperatingCashFlow).toBeCloseTo(9876.54, 2);
  });

  it("5: negative NOCF preserved", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      rows: [cfRow("Net cash used in operating activities", -4321)],
    });
    expect(schedule.netOperatingCashFlow).toBe(-4321);
  });

  it("6: zero NOCF preserved", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      rows: [cfRow("Net cash provided by operating activities", 0)],
    });
    expect(schedule.netOperatingCashFlow).toBe(0);
    expect(scorecardNetOperatingCashFlow(schedule)).toBe(0);
  });

  it("12: missing SoCF rows → unavailable, not zero", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      rows: [],
    });
    expect(schedule.supportStatus).toBe("unavailable");
    expect(schedule.netOperatingCashFlow).toBeNull();
    expect(scorecardNetOperatingCashFlow(schedule)).toBeNull();
  });

  it("operating subtotal missing → error, not zero", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      rows: [cfRow("Net Income", 100)],
    });
    expect(schedule.supportStatus).toBe("error");
    expect(schedule.netOperatingCashFlow).toBeNull();
  });
});

describe("Xero US not_supported + BankSummary guard", () => {
  it("10: Xero US capability is not_supported", () => {
    const cap = xeroCashFlowCapability({ countryCode: "US" });
    expect(cap.supported).toBe(false);
    expect(cap.reason).toBe(XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON);
    expect(cap.customerMessage).toBe(XERO_CASH_FLOW_CUSTOMER_MESSAGE);
  });

  it("builds not_supported schedule with null numeric", () => {
    const schedule = buildNotSupportedCashFlowSchedule({
      endDate: "2026-07-31",
      provider: "xero",
      reason: XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON,
      customerMessage: XERO_CASH_FLOW_CUSTOMER_MESSAGE,
    });
    expect(schedule.supportStatus).toBe("not_supported");
    expect(schedule.netOperatingCashFlow).toBeNull();
    expect(schedule.startDate).toBe("2025-08-01");
    expect(scorecardNetOperatingCashFlow(schedule)).toBeNull();
  });

  it("11: BankSummary cannot create NOCF schedule source", () => {
    expect(() => assertNotBankSummaryCashFlowSource("BankSummary")).toThrow(
      BANK_SUMMARY_FORBIDDEN_AS_CASH_FLOW,
    );
    const bankRow: CanonicalCashFlowRow = {
      label: "Checking",
      amount: 100,
      section: "Bank",
      source: {
        provider: "xero",
        providerFamily: "xero",
        providerProduct: "xero",
        sourceReport: "BankSummary",
        externalEntityId: "t1",
        externalRecordId: "bank-1",
        raw: {},
      },
    };
    expect(() => assertNotBankSummaryCashFlowSource(bankRow.source.sourceReport)).toThrow();
  });
});

describe("persistence into normalized memory", () => {
  it("7: QBO schedule persists via buildAdvisacorNormalizedFinancialData", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      connectionId: "conn-1",
      companyId: "co-1",
      rows: [cfRow("Net cash provided by operating activities", 500)],
    });
    const bundle = emptyReportBundle({
      provider: "quickbooks",
      entity: {
        provider: "quickbooks",
        externalId: "realm-1",
        canonicalId: "qbo:realm-1",
        name: "Demo",
      },
      dateRange: { startDate: "2026-07-01", endDate: "2026-07-31" },
    });
    bundle.cashFlow = schedule.rows;
    bundle.canonicalCashFlowSchedule = schedule;
    bundle.balanceSheet = [
      {
        label: "Checking",
        amount: 1,
        section: "Cash and Cash Equivalents",
        source: cfSource("Checking"),
      },
    ];
    bundle.profitAndLoss = [
      {
        label: "Sales",
        amount: 1,
        section: "Revenue",
        source: cfSource("Sales"),
      },
    ];

    const normalized = buildAdvisacorNormalizedFinancialData({
      connection: {
        id: "conn-1",
        user_id: "u1",
        provider: "quickbooks",
        provider_family: "quickbooks",
        provider_product: "quickbooks",
        external_entity_id: "realm-1",
        external_entity_name: "Demo",
        scopes: [],
        status: "connected",
        metadata_json: { company_id: "co-1" },
      },
      bundle,
      adapterName: "quickBooksAdapter",
      syncId: "sync-1",
      reportPeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
      tenantId: "realm-1",
      tenantName: "Demo",
    });

    expect(ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION).toBe(4);
    expect(normalized.schemaVersion).toBe(4);
    expect(normalized.canonicalCashFlowSchedule?.netOperatingCashFlow).toBe(500);
    expect(normalized.canonicalCashFlowSchedule?.supportStatus).toBe("supported");
    expect(normalized.normalizedCashFlow?.length).toBeGreaterThan(0);
  });

  it("Xero not_supported persists (never from BankSummary amounts)", () => {
    const schedule = buildNotSupportedCashFlowSchedule({
      endDate: "2026-07-31",
      provider: "xero",
      reason: XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON,
      customerMessage: XERO_CASH_FLOW_CUSTOMER_MESSAGE,
    });
    const bundle = emptyReportBundle({
      provider: "xero",
      entity: {
        provider: "xero",
        externalId: "tenant-1",
        canonicalId: "xero:tenant-1",
        name: "Demo",
      },
      dateRange: { startDate: "2026-07-01", endDate: "2026-07-31" },
      missingReports: ["cash_flow"],
    });
    bundle.canonicalCashFlowSchedule = schedule;
    bundle.cashFlow = [];
    bundle.normalizedTransactions = [
      {
        id: "xero:BankSummary:1",
        name: "Checking",
        type: "bank_summary",
        amount: 9999,
        source: {
          provider: "xero",
          providerFamily: "xero",
          providerProduct: "xero",
          sourceReport: "BankSummary",
          externalEntityId: "tenant-1",
          externalRecordId: "bank-1",
          raw: {},
        },
      },
    ];
    bundle.balanceSheet = [
      {
        label: "Checking",
        amount: 0,
        section: "Cash and Cash Equivalents",
        source: {
          provider: "xero",
          providerFamily: "xero",
          providerProduct: "xero",
          sourceReport: "BalanceSheet",
          externalEntityId: "tenant-1",
          externalRecordId: "a1",
          raw: {},
        },
      },
    ];
    bundle.profitAndLoss = [
      {
        label: "Sales",
        amount: 1,
        section: "Revenue",
        source: {
          provider: "xero",
          providerFamily: "xero",
          providerProduct: "xero",
          sourceReport: "ProfitAndLoss",
          externalEntityId: "tenant-1",
          externalRecordId: "p1",
          raw: {},
        },
      },
    ];

    const normalized = buildAdvisacorNormalizedFinancialData({
      connection: {
        id: "b718823a-0eb8-437d-beba-05c41f6482f9",
        user_id: "u1",
        provider: "xero",
        provider_family: "xero",
        provider_product: "xero",
        external_entity_id: "tenant-1",
        external_entity_name: "Demo",
        scopes: [],
        status: "connected",
        metadata_json: { company_id: "co-1" },
      },
      bundle,
      adapterName: "xeroAdapter",
      syncId: "sync-x",
      reportPeriod: { startDate: "2026-07-01", endDate: "2026-07-31" },
      tenantId: "tenant-1",
      tenantName: "Demo",
    });

    expect(normalized.canonicalCashFlowSchedule?.supportStatus).toBe("not_supported");
    expect(normalized.canonicalCashFlowSchedule?.netOperatingCashFlow).toBeNull();
    expect(normalized.canonicalCashFlowSchedule?.supportReason).toBe(
      XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON,
    );
    // BankSummary amount must not leak into NOCF
    expect(normalized.canonicalCashFlowSchedule?.netOperatingCashFlow).not.toBe(9999);
  });
});

describe("Scorecard + Accuracy Contract", () => {
  it("9: QBO READY when supported", () => {
    const trailing = toScorecardCashFlowTrailing(
      buildCanonicalCashFlowScheduleFromProviderRows({
        endDate: "2026-07-31",
        provider: "quickbooks",
        rows: [cfRow("Net cash provided by operating activities", 250)],
      }),
    );
    expect(
      resolveNetOpCashFlowTileState({
        hydrationActive: false,
        hasSummary: true,
        cashFlowTrailing12M: trailing,
      }),
    ).toEqual({ status: "ready" });
  });

  it("10: Xero US NOT_SUPPORTED on Scorecard", () => {
    const trailing = toScorecardCashFlowTrailing(
      buildNotSupportedCashFlowSchedule({
        endDate: "2026-07-31",
        provider: "xero",
        reason: XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON,
        customerMessage: XERO_CASH_FLOW_CUSTOMER_MESSAGE,
      }),
    );
    const state = resolveNetOpCashFlowTileState({
      hydrationActive: false,
      hasSummary: true,
      cashFlowTrailing12M: trailing,
    });
    expect(state).toEqual({
      status: "not_supported",
      message: XERO_CASH_FLOW_CUSTOMER_MESSAGE,
    });
  });

  it("13: Accuracy Contract QBO uses real provenance only", () => {
    const schedule = buildCanonicalCashFlowScheduleFromProviderRows({
      endDate: "2026-07-31",
      provider: "quickbooks",
      rows: [cfRow("Net cash provided by operating activities", 250)],
    });
    const factor = factorizeNetOpCashFlow({
      normalizedIncomeStatement: [],
      normalizedBalanceSheet: [],
      canonicalCashFlowSchedule: schedule,
    } as any);
    expect(factor.numeric).toBe(250);
    expect(factor.computation_status).toBe("computed");
    expect(JSON.stringify(factor)).not.toContain("advisacor:");
    expect(JSON.stringify(factor)).not.toContain("BankSummary");
    expect(factor.composition.length).toBeGreaterThan(0);
    expect(factor.composition[0].source.sourceReport).toBe("CashFlow");
  });

  it("14: Accuracy Contract Xero not_supported", () => {
    const schedule = buildNotSupportedCashFlowSchedule({
      endDate: "2026-07-31",
      provider: "xero",
      reason: XERO_US_CASH_FLOW_NOT_SUPPORTED_REASON,
      customerMessage: XERO_CASH_FLOW_CUSTOMER_MESSAGE,
    });
    const factor = factorizeNetOpCashFlow({
      normalizedIncomeStatement: [],
      normalizedBalanceSheet: [],
      canonicalCashFlowSchedule: schedule,
    } as any);
    expect(factor.numeric).toBeNull();
    expect(factor.computation_status).toBe("not_supported");
    expect(factor.formula).toBeNull();
    expect(factor.composition).toEqual([]);
  });
});
