import type { AccountingDateRange, AccountingProvider, AdvisacorNormalizedEntity, AdvisacorNormalizedFinancialData } from "../../integrations/accounting/types";

export type SupportingScheduleStatus = "available" | "unavailable" | "failed" | "not_available";

export type SupportingScheduleAvailability = {
  provider: AccountingProvider | string;
  companyId?: string | null;
  selectedPeriod?: AccountingDateRange | null;
  reportName: string;
  attemptedEndpoint: string;
  status: SupportingScheduleStatus;
  rowCount: number;
  totalAmount?: number;
  errorMessage?: string | null;
  required?: boolean;
  normalizedKey?: keyof Pick<
    AdvisacorNormalizedFinancialData,
    | "normalizedAccounts"
    | "normalizedTrialBalance"
    | "normalizedBalanceSheet"
    | "normalizedIncomeStatement"
    | "normalizedTransactions"
    | "normalizedARAging"
    | "normalizedAPAging"
    | "normalizedBudgets"
    | "normalizedDepartments"
    | "normalizedClasses"
    | "normalizedLocations"
    | "normalizedProjects"
  >;
};

export const OPTIONAL_SUPPORTING_SCHEDULE_MESSAGE = "This supporting schedule was not available from the connected accounting system for the selected period.";
export const OPTIONAL_SUPPORTING_SCHEDULE_REASON = "This connected system did not return this optional schedule for the selected period.";

export const QUICKBOOKS_SUPPORTING_REPORTS = {
  accounts: ["Account query"],
  trialBalance: ["TrialBalance"],
  arAging: ["AccountsReceivableAgingSummary", "AccountsReceivableAgingDetail", "OpenInvoices", "CustomerBalanceSummary"],
  apAging: ["AccountsPayableAgingSummary", "AccountsPayableAgingDetail", "UnpaidBills", "VendorBalanceSummary"],
  inventory: ["InventoryValuationSummary", "InventoryValuationDetail"],
  budget: ["BudgetVsActual"],
  cash: ["StatementOfCashFlows"],
  departments: ["Department query"],
  classes: ["Class query"],
  locations: ["Department query"],
  projects: ["Project query", "Customer query"],
} as const;

export const XERO_SUPPORTING_REPORTS = {
  accounts: ["Accounts"],
  trialBalance: ["Reports/TrialBalance"],
  arAging: ["Reports/AgedReceivablesByContact"],
  apAging: ["Reports/AgedPayablesByContact"],
  budget: ["Reports/BudgetSummary"],
  cash: ["Reports/BankSummary"],
  departments: ["TrackingCategories"],
  classes: ["TrackingCategories"],
  locations: ["TrackingCategories"],
  projects: ["TrackingCategories"],
} as const;

function amount(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function totalEntityAmount(rows: Array<{ amount?: number; balance?: number; netAmount?: number; debit?: number; credit?: number }> = []) {
  return rows.reduce((total, row) => total + amount(row.amount ?? row.balance ?? row.netAmount ?? amount(row.debit) - amount(row.credit)), 0);
}

export function isNotAvailableRows(rows: unknown) {
  return Array.isArray(rows) && rows.length > 0 && rows.every((row) => {
    const record = row as Record<string, unknown>;
    return record?.type === "not_available" || String(record?.id || "").endsWith(":not_available");
  });
}

export function hasAvailableScheduleRows(rows: unknown) {
  return Array.isArray(rows) && rows.length > 0 && !isNotAvailableRows(rows);
}

export function notAvailableSchedule(provider: AccountingProvider | string, reportName: string): AdvisacorNormalizedEntity[] {
  return [{
    id: `${provider}:${reportName}:not_available`,
    name: "Not available from connected system",
    type: "not_available",
    metadata: {
      status: "not_available",
      reason: OPTIONAL_SUPPORTING_SCHEDULE_REASON,
    },
    source: {
      provider: provider as AccountingProvider,
      providerFamily: String(provider),
      providerProduct: String(provider),
      sourceReport: reportName,
    },
  }];
}

export function availabilityFromRows({
  provider,
  companyId,
  selectedPeriod,
  reportName,
  attemptedEndpoint,
  rows,
  errorMessage,
  required = false,
  normalizedKey,
}: {
  provider: AccountingProvider | string;
  companyId?: string | null;
  selectedPeriod?: AccountingDateRange | null;
  reportName: string;
  attemptedEndpoint: string;
  rows?: unknown[];
  errorMessage?: string | null;
  required?: boolean;
  normalizedKey?: SupportingScheduleAvailability["normalizedKey"];
}): SupportingScheduleAvailability {
  const available = hasAvailableScheduleRows(rows);
  const failed = Boolean(errorMessage);
  return {
    provider,
    companyId,
    selectedPeriod,
    reportName,
    attemptedEndpoint,
    status: failed ? "failed" : available ? "available" : "not_available",
    rowCount: available && Array.isArray(rows) ? rows.length : 0,
    totalAmount: available && Array.isArray(rows) ? totalEntityAmount(rows as Array<{ amount?: number; balance?: number; netAmount?: number; debit?: number; credit?: number }>) : undefined,
    errorMessage: errorMessage || (available ? null : OPTIONAL_SUPPORTING_SCHEDULE_REASON),
    required,
    normalizedKey,
  };
}

export function availabilityFromNormalizedData(data: AdvisacorNormalizedFinancialData | null | undefined): SupportingScheduleAvailability[] {
  if (!data) return [];
  const providerReports = data.sourceSystem === "quickbooks" ? QUICKBOOKS_SUPPORTING_REPORTS : XERO_SUPPORTING_REPORTS;
  const period = data.reportPeriod || null;
  const base = { provider: data.sourceSystem, companyId: data.companyId, selectedPeriod: period };
  return [
    availabilityFromRows({ ...base, reportName: "Balance Sheet", attemptedEndpoint: data.sourceSystem === "xero" ? "Reports/BalanceSheet" : "BalanceSheet", rows: data.normalizedBalanceSheet, required: true, normalizedKey: "normalizedBalanceSheet" }),
    availabilityFromRows({ ...base, reportName: "Profit and Loss", attemptedEndpoint: data.sourceSystem === "xero" ? "Reports/ProfitAndLoss" : "ProfitAndLoss", rows: data.normalizedIncomeStatement, required: true, normalizedKey: "normalizedIncomeStatement" }),
    availabilityFromRows({ ...base, reportName: "Trial Balance", attemptedEndpoint: providerReports.trialBalance[0], rows: data.normalizedTrialBalance, normalizedKey: "normalizedTrialBalance" }),
    availabilityFromRows({ ...base, reportName: "Chart of Accounts", attemptedEndpoint: providerReports.accounts[0], rows: data.normalizedAccounts, normalizedKey: "normalizedAccounts" }),
    availabilityFromRows({ ...base, reportName: "AR Aging", attemptedEndpoint: providerReports.arAging[0], rows: data.normalizedARAging, normalizedKey: "normalizedARAging" }),
    availabilityFromRows({ ...base, reportName: "AP Aging", attemptedEndpoint: providerReports.apAging[0], rows: data.normalizedAPAging, normalizedKey: "normalizedAPAging" }),
    availabilityFromRows({ ...base, reportName: "Budget", attemptedEndpoint: providerReports.budget[0], rows: data.normalizedBudgets, normalizedKey: "normalizedBudgets" }),
    availabilityFromRows({ ...base, reportName: "Departments", attemptedEndpoint: providerReports.departments[0], rows: data.normalizedDepartments, normalizedKey: "normalizedDepartments" }),
    availabilityFromRows({ ...base, reportName: "Classes", attemptedEndpoint: providerReports.classes[0], rows: data.normalizedClasses, normalizedKey: "normalizedClasses" }),
    availabilityFromRows({ ...base, reportName: "Locations", attemptedEndpoint: providerReports.locations[0], rows: data.normalizedLocations, normalizedKey: "normalizedLocations" }),
    availabilityFromRows({ ...base, reportName: "Projects", attemptedEndpoint: providerReports.projects[0], rows: data.normalizedProjects, normalizedKey: "normalizedProjects" }),
  ];
}
