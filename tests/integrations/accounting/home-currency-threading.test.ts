import { describe, expect, it } from "vitest";
import { buildAdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/advisacor-data-model";
import type {
  AccountingConnectionRecord,
  CanonicalReportBundle,
} from "@/lib/integrations/accounting/types";

function makeBundle(home_currency?: string): CanonicalReportBundle {
  return {
    provider: "quickbooks",
    entity: null,
    dateRange: { startDate: "2026-06-01", endDate: "2026-06-30" },
    chartOfAccounts: [],
    trialBalance: [],
    profitAndLoss: [],
    balanceSheet: [],
    cashFlow: [],
    missingReports: [],
    sourceMetadata: {
      provider: "quickbooks",
      providerFamily: "quickbooks",
      providerProduct: "quickbooks",
      home_currency,
      multicurrency_enabled: false,
    },
  };
}

function makeConnection(): AccountingConnectionRecord {
  return {
    id: "conn-mc2c",
    user_id: "user-mc2c",
    provider: "quickbooks",
    provider_family: "quickbooks",
    provider_product: "quickbooks",
    external_entity_id: null,
    external_entity_name: null,
    scopes: [],
    status: "connected",
    metadata_json: { company_id: "cmp-mc2c" },
  } as AccountingConnectionRecord;
}

describe("Phase MC-2c — home_currency threads from bundle onto normalizedData", () => {
  it("copies CAD from sourceMetadata to normalizedData.home_currency", () => {
    const normalized = buildAdvisacorNormalizedFinancialData({
      connection: makeConnection(),
      bundle: makeBundle("CAD"),
      adapterName: "quickBooksAdapter",
      syncId: "sync-1",
      reportPeriod: { startDate: "2026-06-01", endDate: "2026-06-30" },
      tenantId: null,
      tenantName: "Test Co",
    });
    expect(normalized.home_currency).toBe("CAD");
  });

  it("uppercases lowercase currency codes", () => {
    const normalized = buildAdvisacorNormalizedFinancialData({
      connection: makeConnection(),
      bundle: makeBundle("eur"),
      adapterName: "quickBooksAdapter",
      syncId: "sync-2",
      reportPeriod: { startDate: "2026-06-01", endDate: "2026-06-30" },
      tenantId: null,
      tenantName: "Test Co",
    });
    expect(normalized.home_currency).toBe("EUR");
  });

  it("leaves home_currency undefined when bundle has no currency", () => {
    const normalized = buildAdvisacorNormalizedFinancialData({
      connection: makeConnection(),
      bundle: makeBundle(undefined),
      adapterName: "quickBooksAdapter",
      syncId: "sync-3",
      reportPeriod: { startDate: "2026-06-01", endDate: "2026-06-30" },
      tenantId: null,
      tenantName: "Test Co",
    });
    expect(normalized.home_currency).toBeUndefined();
  });
});
