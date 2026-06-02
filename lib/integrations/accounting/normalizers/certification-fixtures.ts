import { normalizeAccounts } from "./accounts";
import { emptyReportBundle, normalizeTabularReportRows, normalizeTrialBalanceRows } from "./reports";
import type {
  AccountingDateRange,
  AccountingProvider,
  AdvisacorNormalizedEntity,
  CanonicalSourceMetadata,
  ConnectedAccountingEntity,
} from "../types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function source(provider: AccountingProvider, sourceReport: string, raw: unknown, externalEntityId?: string, externalRecordId?: string): CanonicalSourceMetadata {
  return {
    provider,
    providerFamily: provider,
    providerProduct: provider,
    externalEntityId,
    externalRecordId,
    sourceReport,
    raw,
  };
}

function normalizedEntities(provider: AccountingProvider, sourceReport: string, rows: unknown[], externalEntityId?: string): AdvisacorNormalizedEntity[] {
  return rows.map((row, index) => {
    const record = asRecord(row);
    const externalRecordId = String(record.id || record.Id || record.ContactID || record.AccountID || record.recordId || `${sourceReport}:${index}`);
    return {
      id: `${provider}:${sourceReport}:${externalRecordId}`,
      name: String(record.name || record.Name || record.label || record.accountName || record.ContactName || `${sourceReport} ${index + 1}`),
      type: String(record.type || record.Type || record.status || record.Status || sourceReport),
      balance: Number(record.balance ?? record.Balance ?? record.amount ?? record.Amount ?? 0),
      amount: Number(record.amount ?? record.Amount ?? record.value ?? record.Value ?? 0),
      metadata: {
        certification_fixture: true,
      },
      source: source(provider, sourceReport, row, externalEntityId, externalRecordId),
    };
  });
}

export function buildCertificationFixtureReportBundle({
  provider,
  entity,
  dateRange,
  fixture,
}: {
  provider: AccountingProvider;
  entity: ConnectedAccountingEntity;
  dateRange: AccountingDateRange;
  fixture: unknown;
}) {
  const record = asRecord(fixture);
  const reports = asRecord(record.reports);
  const externalEntityId = entity.externalId;
  const bundle = emptyReportBundle({ provider, entity, dateRange });

  bundle.chartOfAccounts = normalizeAccounts(
    provider,
    asArray(record.accounts || record.Accounts || record.chartOfAccounts || reports.accounts),
    externalEntityId,
  );
  bundle.trialBalance = normalizeTrialBalanceRows(
    provider,
    asArray(record.trialBalance || record.TrialBalance || reports.trialBalance),
    externalEntityId,
  );
  bundle.balanceSheet = normalizeTabularReportRows(
    provider,
    "BalanceSheet",
    asArray(record.balanceSheet || record.BalanceSheet || reports.balanceSheet),
    externalEntityId,
  );
  bundle.profitAndLoss = normalizeTabularReportRows(
    provider,
    "ProfitAndLoss",
    asArray(record.incomeStatement || record.profitAndLoss || record.ProfitAndLoss || reports.incomeStatement || reports.profitAndLoss),
    externalEntityId,
  );
  bundle.cashFlow = normalizeTabularReportRows(
    provider,
    "CashFlow",
    asArray(record.cashFlow || record.CashFlow || reports.cashFlow),
    externalEntityId,
  );
  bundle.normalizedTransactions = normalizedEntities(provider, "Transactions", asArray(record.transactions || record.Transactions || reports.transactions), externalEntityId);
  bundle.normalizedARAging = normalizedEntities(provider, "ARAging", asArray(record.arAging || record.ARAging || reports.arAging), externalEntityId);
  bundle.normalizedAPAging = normalizedEntities(provider, "APAging", asArray(record.apAging || record.APAging || reports.apAging), externalEntityId);
  bundle.normalizedBudgets = normalizedEntities(provider, "Budgets", asArray(record.budgets || record.Budgets || reports.budgets), externalEntityId);
  bundle.normalizedDepartments = normalizedEntities(provider, "Departments", asArray(record.departments || record.Departments || reports.departments), externalEntityId);
  bundle.normalizedLocations = normalizedEntities(provider, "Locations", asArray(record.locations || record.Locations || reports.locations), externalEntityId);
  bundle.normalizedClasses = normalizedEntities(provider, "Classes", asArray(record.classes || record.Classes || reports.classes), externalEntityId);
  bundle.normalizedProjects = normalizedEntities(provider, "Projects", asArray(record.projects || record.Projects || reports.projects), externalEntityId);
  bundle.normalizedVendors = normalizedEntities(provider, "Vendors", asArray(record.vendors || record.Vendors || reports.vendors), externalEntityId);
  bundle.normalizedCustomers = normalizedEntities(provider, "Customers", asArray(record.customers || record.Customers || reports.customers), externalEntityId);
  bundle.sourceMetadata.raw = fixture;

  return bundle;
}
