import type {
  AccountingDateRange,
  AccountingProvider,
  CanonicalBalanceSheetRow,
  CanonicalCashFlowRow,
  CanonicalPnLRow,
  CanonicalReportBundle,
  CanonicalSourceMetadata,
  CanonicalTrialBalanceRow,
  ConnectedAccountingEntity,
} from "../types";
import { parseAmountOrZero } from "@/lib/parse/amount";
import { normalizeQuickBooksFinancialStatement, normalizeStructuredReportRows } from "./financial-statements";

// Phase MC-2e.2 (Issue #6, Gap I-3): local parseAmount replaced by shared
// locale-aware parser. QBO/Xero API responses are always en-US-formatted;
// calling parseAmountOrZero with no options preserves that behavior exactly.
const parseAmount = (value: unknown): number => parseAmountOrZero(value);

function source(provider: AccountingProvider, sourceReport: string, raw: unknown, externalEntityId?: string): CanonicalSourceMetadata {
  return {
    provider,
    providerFamily: provider,
    providerProduct: provider,
    externalEntityId,
    sourceReport,
    raw,
  };
}

export function normalizeTabularReportRows<T extends CanonicalPnLRow | CanonicalBalanceSheetRow | CanonicalCashFlowRow>(
  provider: AccountingProvider,
  sourceReport: string,
  rows: unknown[] = [],
  externalEntityId?: string,
): T[] {
  if (provider === "quickbooks") {
    return normalizeQuickBooksFinancialStatement<T>(sourceReport, rows, externalEntityId);
  }
  return normalizeStructuredReportRows<T>(provider, sourceReport, rows, externalEntityId);
}

export function normalizeTrialBalanceRows(
  provider: AccountingProvider,
  rows: unknown[] = [],
  externalEntityId?: string,
): CanonicalTrialBalanceRow[] {
  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      accountId: String(record.accountId || record.id || record.account_code || record.accountCode || record.name || ""),
      accountName: String(record.accountName || record.name || record.account_name || "Unlabeled account"),
      debit: parseAmount(record.debit),
      credit: parseAmount(record.credit),
      netAmount: parseAmount(record.netAmount ?? record.amount),
      source: source(provider, "TrialBalance", row, externalEntityId),
    };
  });
}

export function emptyReportBundle({
  provider,
  entity,
  dateRange,
  missingReports = [],
}: {
  provider: AccountingProvider;
  entity: ConnectedAccountingEntity | null;
  dateRange: AccountingDateRange;
  missingReports?: string[];
}): CanonicalReportBundle {
  return {
    provider,
    entity,
    dateRange,
    chartOfAccounts: [],
    trialBalance: [],
    profitAndLoss: [],
    balanceSheet: [],
    cashFlow: [],
    missingReports,
    sourceMetadata: {
      provider,
      providerFamily: provider,
      providerProduct: provider,
      externalEntityId: entity?.externalId,
    },
  };
}
