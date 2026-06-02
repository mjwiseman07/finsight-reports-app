import { buildAdvisacorNormalizedFinancialData, validateAdvisacorNormalizedFinancialData } from "./advisacor-data-model";
import { buildMappedFinancialSummary } from "./normalizers/financial-statements";
import { dynamics365AccountingProvider } from "./providers/dynamics365";
import { netSuiteAccountingProvider } from "./providers/netsuite";
import { quickBooksAccountingProvider } from "./providers/quickbooks";
import { sageAccountingProvider } from "./providers/sage";
import { xeroAccountingProvider } from "./providers/xero";
import type {
  AccountingConnectionRecord,
  AccountingMappingAdapterName,
  AccountingProvider,
  AccountingProviderAdapter,
  AccountingProviderMappingAdapter,
  AccountingDateRange,
  ProviderRawReports,
} from "./types";

type ProviderWithReports = Pick<AccountingProviderAdapter, "provider" | "getPrimaryFinancialReports">;

function rawReportsPulled(bundle: ProviderRawReports["bundle"]) {
  return {
    accounts: Boolean(bundle.chartOfAccounts?.length),
    trialBalance: Boolean(bundle.trialBalance?.length),
    balanceSheet: Boolean(bundle.balanceSheet?.length),
    incomeStatement: Boolean(bundle.profitAndLoss?.length),
    arAging: Boolean(bundle.normalizedARAging?.length),
    apAging: Boolean(bundle.normalizedAPAging?.length),
  };
}

function assertAdapterOwnsConnection(sourceSystem: AccountingProvider, connection: AccountingConnectionRecord) {
  if (connection.provider !== sourceSystem) {
    throw new Error("Provider adapter mismatch");
  }
}

function sumAbsAmounts(rows: Array<{ amount?: number }>) {
  return rows.reduce((total, row) => total + Math.abs(Number(row.amount || 0)), 0);
}

function mappingDiagnostics(normalizedData: Awaited<ReturnType<typeof buildAdvisacorNormalizedFinancialData>>) {
  const balanceSheet = normalizedData.normalizedBalanceSheet;
  const incomeStatement = normalizedData.normalizedIncomeStatement;
  const cashBalance = balanceSheet
    .filter((row) => /cash|bank|checking|savings/i.test(`${row.label} ${row.section || ""}`))
    .reduce((total, row) => total + Number(row.amount || 0), 0);
  const mappedFinancialSummary = buildMappedFinancialSummary(balanceSheet, incomeStatement);
  const diagnostics = {
    sourceSystem: normalizedData.sourceSystem,
    adapterName: normalizedData.adapterName,
    accountsMapped: normalizedData.normalizedAccounts.length,
    trialBalanceRowsMapped: normalizedData.normalizedTrialBalance.length,
    balanceSheetRowsMapped: balanceSheet.length,
    incomeStatementRowsMapped: incomeStatement.length,
    balanceSheetTotalAssets: mappedFinancialSummary.totalAssets,
    balanceSheetTotalLiabilities: mappedFinancialSummary.totalLiabilities,
    balanceSheetTotalEquity: mappedFinancialSummary.totalEquity,
    incomeStatementRevenue: mappedFinancialSummary.revenue,
    incomeStatementExpenses: mappedFinancialSummary.expenses,
    incomeStatementNetIncome: mappedFinancialSummary.netIncome,
    mappedFinancialSummary,
    cashBalance,
  };
  console.info("[accounting/mapping]", { event: "mapped_financial_summary", ...diagnostics });
  return diagnostics;
}

function assertXeroMappedSafely(rawReports: ProviderRawReports, normalizedData: Awaited<ReturnType<typeof buildAdvisacorNormalizedFinancialData>>) {
  if (normalizedData.sourceSystem !== "xero") return;
  const diagnostics = ((rawReports.bundle.sourceMetadata.raw as Record<string, unknown> | undefined)?.diagnostics as Record<string, unknown> | undefined) || {};
  const rawAccountsCount = Number(diagnostics.xeroRawAccountsCount || 0);
  const rawTrialBalanceRowsCount = Number(diagnostics.xeroRawTrialBalanceFlattenedRowsCount || diagnostics.xeroRawTrialBalanceRowsCount || 0);
  if (rawAccountsCount > 0 && normalizedData.normalizedAccounts.length === 0) {
    throw new Error("Xero Accounts data was retrieved but could not be normalized safely.");
  }
  if (rawTrialBalanceRowsCount > 0 && normalizedData.normalizedTrialBalance.length === 0) {
    throw new Error("Xero Trial Balance data was retrieved but could not be normalized safely.");
  }
  const rawCoreRowsPresent = rawReports.rawReportsPulled.balanceSheet || rawReports.rawReportsPulled.incomeStatement || rawReports.rawReportsPulled.trialBalance || rawReports.rawReportsPulled.accounts;
  const mappedCoreValue = sumAbsAmounts(normalizedData.normalizedBalanceSheet) + sumAbsAmounts(normalizedData.normalizedIncomeStatement) + normalizedData.normalizedTrialBalance.reduce((total, row) => total + Math.abs(Number(row.debit || 0)) + Math.abs(Number(row.credit || 0)) + Math.abs(Number(row.netAmount || 0)), 0);
  if (rawCoreRowsPresent && mappedCoreValue === 0) {
    throw new Error("Xero source data was retrieved but could not be normalized safely.");
  }
}

function createMappingAdapter({
  sourceSystem,
  adapterName,
  provider,
}: {
  sourceSystem: AccountingProvider;
  adapterName: AccountingMappingAdapterName;
  provider: ProviderWithReports;
}): AccountingProviderMappingAdapter {
  return {
    sourceSystem,
    adapterName,
    async connect() {
      return { provider: sourceSystem };
    },
    async fetchRawReports(connection: AccountingConnectionRecord, reportPeriod: AccountingDateRange) {
      assertAdapterOwnsConnection(sourceSystem, connection);
      const bundle = await provider.getPrimaryFinancialReports({ connection, dateRange: reportPeriod });
      if (bundle.provider !== sourceSystem) throw new Error("Provider adapter mismatch");
      console.info("[accounting/mapping]", {
        event: "raw_provider_data",
        sourceSystem,
        adapterName,
        connectionId: connection.id,
        reportPeriod,
        rawReportsPulled: rawReportsPulled(bundle),
        chartOfAccountsCount: bundle.chartOfAccounts.length,
        trialBalanceCount: bundle.trialBalance.length,
        balanceSheetCount: bundle.balanceSheet.length,
        incomeStatementCount: bundle.profitAndLoss.length,
      });
      return {
        sourceSystem,
        adapterName,
        bundle,
        rawReportsPulled: rawReportsPulled(bundle),
      };
    },
    async normalize(rawReports, context) {
      if (rawReports.sourceSystem !== sourceSystem || rawReports.adapterName !== adapterName || rawReports.bundle.provider !== sourceSystem) {
        throw new Error("Provider adapter mismatch");
      }
      const normalizedData = buildAdvisacorNormalizedFinancialData({
        connection: context.connection,
        bundle: rawReports.bundle,
        adapterName,
        syncId: context.syncId,
        reportPeriod: context.reportPeriod,
        tenantId: context.tenantId,
        tenantName: context.tenantName,
      });
      if (normalizedData.sourceSystem !== sourceSystem || normalizedData.adapterName !== adapterName) {
        throw new Error("Mapping adapter mismatch");
      }
      console.info("[accounting/mapping]", {
        event: "normalized_provider_data",
        sourceSystem: normalizedData.sourceSystem,
        adapterName: normalizedData.adapterName,
        connectionId: normalizedData.connectionId,
        syncId: normalizedData.syncId,
        normalizedAccountsCount: normalizedData.normalizedAccounts.length,
        normalizedTrialBalanceCount: normalizedData.normalizedTrialBalance.length,
        normalizedBalanceSheetCount: normalizedData.normalizedBalanceSheet.length,
        normalizedIncomeStatementCount: normalizedData.normalizedIncomeStatement.length,
      });
      mappingDiagnostics(normalizedData);
      if (sourceSystem === "xero") {
        assertXeroMappedSafely(rawReports, normalizedData);
      }
      return normalizedData;
    },
    validate(normalizedData) {
      if (normalizedData.sourceSystem !== sourceSystem) throw new Error("Provider adapter mismatch");
      if (normalizedData.adapterName !== adapterName) throw new Error("Mapping adapter mismatch");
      return validateAdvisacorNormalizedFinancialData(normalizedData);
    },
  };
}

export const quickBooksAdapter = createMappingAdapter({
  sourceSystem: "quickbooks",
  adapterName: "quickBooksAdapter",
  provider: quickBooksAccountingProvider,
});

export const xeroAdapter = createMappingAdapter({
  sourceSystem: "xero",
  adapterName: "xeroAdapter",
  provider: xeroAccountingProvider,
});

export const netSuiteAdapter = createMappingAdapter({
  sourceSystem: "netsuite",
  adapterName: "netSuiteAdapter",
  provider: netSuiteAccountingProvider,
});

export const dynamicsAdapter = createMappingAdapter({
  sourceSystem: "dynamics365",
  adapterName: "dynamicsAdapter",
  provider: dynamics365AccountingProvider,
});

export const sageAdapter = createMappingAdapter({
  sourceSystem: "sage",
  adapterName: "sageAdapter",
  provider: sageAccountingProvider,
});

export const accountingProviderAdapters = {
  quickbooks: quickBooksAdapter,
  xero: xeroAdapter,
  netsuite: netSuiteAdapter,
  dynamics: dynamicsAdapter,
  dynamics365: dynamicsAdapter,
  sage: sageAdapter,
} as const;

export function getAccountingProviderMappingAdapter(sourceSystem: string): AccountingProviderMappingAdapter {
  const normalizedSource = String(sourceSystem || "").toLowerCase() as keyof typeof accountingProviderAdapters;
  const adapter = accountingProviderAdapters[normalizedSource];
  if (!adapter) throw new Error(`Unsupported accounting provider: ${sourceSystem}`);
  return adapter;
}
