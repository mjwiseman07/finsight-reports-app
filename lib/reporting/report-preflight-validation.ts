import { providerIdentitiesMatch } from "../integrations/accounting/report-data-context";
import type { ReportDataContext } from "../integrations/accounting/report-data-context";

export type PreflightSeverity = "BLOCKER" | "WARNING" | "INFO";

export type PreflightIssue = {
  severity: PreflightSeverity;
  code: string;
  message: string;
  affected?: string;
  expected?: string | number;
  actual?: string | number;
  variance?: number;
  recommendedFix?: string;
};

export type ReportPreflightOptions = {
  requiresLiveData?: boolean;
  staleThresholdHours?: number;
  staleApproved?: boolean;
  schedules?: Array<{
    name: string;
    sourceSystem?: string | null;
    connectionId?: string | null;
    syncId?: string | null;
    reportPeriod?: { startDate?: string; endDate?: string; comparative?: boolean };
    rows?: unknown[];
  }>;
  fallbackData?: { sourceSystem?: string | null; connectionId?: string | null } | null;
  rawSourceDataRetrieved?: boolean;
  providerConfirmedNoActivity?: boolean;
};

export type ReportPreflightResult = {
  passed: boolean;
  blockers: PreflightIssue[];
  warnings: PreflightIssue[];
  info: PreflightIssue[];
  sourceSystem?: string;
  connectionId?: string;
  syncId?: string;
  reportPeriod?: ReportDataContext["reportPeriod"];
  diagnostics: {
    accountsCount: number;
    trialBalanceRows: number;
    balanceSheetRows: number;
    incomeStatementRows: number;
    cashPerBalanceSheet: number;
    cashPerSupportingAccounts: number;
    cashVariance: number;
    lastSyncedAt?: string;
  };
};

const ROUNDING_TOLERANCE = 1;

function amount(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function absVariance(left: number, right: number) {
  return Math.abs(left - right);
}

function hasRows(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function hasAvailableRows(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.some((row) => {
    if (!row || typeof row !== "object") return true;
    const record = row as Record<string, unknown>;
    return record.type !== "not_available" && record.id !== `${record.sourceSystem || ""}:not_available`;
  });
}

function sectionIncludes(row: { label?: string; section?: string }, pattern: RegExp) {
  return pattern.test(`${row.label || ""} ${row.section || ""}`);
}

type AmountRow = { label?: string; section?: string; amount?: number; netAmount?: number; debit?: number; credit?: number };

function sumRows(rows: AmountRow[], pick: (row: AmountRow) => boolean, value = "amount") {
  return rows.filter(pick).reduce((total, row) => total + amount((row as Record<string, unknown>)[value]), 0);
}

function findExplicitTotal(rows: Array<{ label?: string; section?: string; amount?: number }>, pattern: RegExp) {
  const match = rows.find((row) => pattern.test(String(row.label || "")));
  return match ? amount(match.amount) : null;
}

function add(issue: PreflightIssue, target: PreflightIssue[]) {
  target.push(issue);
}

function blocker(code: string, message: string, extra: Partial<PreflightIssue> = {}): PreflightIssue {
  return {
    severity: "BLOCKER",
    code,
    message,
    recommendedFix: "Sync the selected accounting connection again, then regenerate the report.",
    ...extra,
  };
}

function warning(code: string, message: string, extra: Partial<PreflightIssue> = {}): PreflightIssue {
  return { severity: "WARNING", code, message, ...extra };
}

function info(code: string, message: string, extra: Partial<PreflightIssue> = {}): PreflightIssue {
  return { severity: "INFO", code, message, ...extra };
}

function isZeroCoreData(context: ReportDataContext | null | undefined) {
  const data = context?.normalizedData;
  if (!data) return false;
  const values = [
    ...data.normalizedTrialBalance.map((row) => amount(row.debit) + amount(row.credit) + Math.abs(amount(row.netAmount))),
    ...data.normalizedBalanceSheet.map((row) => Math.abs(amount(row.amount))),
    ...data.normalizedIncomeStatement.map((row) => Math.abs(amount(row.amount))),
  ];
  return values.length > 0 && values.every((value) => value === 0);
}

export function validateReportPreflight(context: ReportDataContext | null | undefined, options: ReportPreflightOptions = {}): ReportPreflightResult {
  const blockers: PreflightIssue[] = [];
  const warnings: PreflightIssue[] = [];
  const infoItems: PreflightIssue[] = [];
  const data = context?.normalizedData;
  const noActivityConfirmed = Boolean(options.providerConfirmedNoActivity || data?.validation?.warnings?.some((item) => /no financial activity/i.test(String(item))));
  const accounts = data?.normalizedAccounts || [];
  const trialBalance = data?.normalizedTrialBalance || [];
  const balanceSheet = data?.normalizedBalanceSheet || [];
  const incomeStatement = data?.normalizedIncomeStatement || [];
  const diagnostics = {
    accountsCount: accounts.length,
    trialBalanceRows: trialBalance.length,
    balanceSheetRows: balanceSheet.length,
    incomeStatementRows: incomeStatement.length,
    cashPerBalanceSheet: 0,
    cashPerSupportingAccounts: 0,
    cashVariance: 0,
    lastSyncedAt: data?.lastSyncedAt,
  };

  const providerIdentity = providerIdentitiesMatch(
    {
      sourceSystem: context?.sourceSystem,
      connectionId: context?.connectionId,
      tenantId: context?.tenantId,
      tenantName: context?.tenantName,
    },
    {
      sourceSystem: data?.sourceSystem,
      connectionId: data?.connectionId,
      tenantId: data?.tenantId,
      tenantName: data?.tenantName,
    },
  );
  console.info("[report-preflight/provider-identity]", {
    expected: {
      sourceSystem: context?.sourceSystem || null,
      connectionId: context?.connectionId || null,
      tenantId: context?.tenantId || null,
      tenantName: context?.tenantName || null,
    },
    actual: {
      sourceSystem: data?.sourceSystem || null,
      connectionId: data?.connectionId || null,
      tenantId: data?.tenantId || null,
      tenantName: data?.tenantName || null,
    },
    resolvedProviderIdentity: {
      providerKey: providerIdentity.expectedIdentity.providerKey || providerIdentity.actualIdentity.providerKey,
      expectedProviderKey: providerIdentity.expectedIdentity.providerKey,
      actualProviderKey: providerIdentity.actualIdentity.providerKey,
    },
  });

  if (!providerIdentity.matches) {
    add(blocker("PROVIDER_MISMATCH", "Report blocked: provider mismatch detected.", {
      affected: "ReportDataContext",
      expected: `${context?.sourceSystem || "missing"} / ${context?.connectionId || "missing"} / ${context?.tenantId || "missing"} / ${context?.tenantName || "missing"}`,
      actual: `${data?.sourceSystem || "missing"} / ${data?.connectionId || "missing"} / ${data?.tenantId || "missing"} / ${data?.tenantName || "missing"}`,
    }), blockers);
  }
  if (context?.adapterName !== data?.adapterName) {
    add(blocker("PROVIDER_MISMATCH", "Report blocked: provider mismatch detected.", {
      affected: "ReportDataContext",
      expected: context?.adapterName || "missing",
      actual: data?.adapterName || "missing",
      recommendedFix: "Select the accounting provider again and sync using that provider's mapping adapter.",
    }), blockers);
  }

  if (!hasRows(balanceSheet) || !hasRows(incomeStatement)) {
    add(blocker("CORE_STATEMENTS_MISSING", "Report blocked: required core financial statements are missing.", {
      affected: "Balance Sheet / Income Statement",
      expected: "Balance Sheet and Income Statement populated",
      actual: `balanceSheet=${balanceSheet.length}, incomeStatement=${incomeStatement.length}`,
    }), blockers);
  }
  const supportWarningsAllowed = !noActivityConfirmed;
  if (supportWarningsAllowed && !hasRows(accounts)) {
    add(warning("ACCOUNTS_MISSING", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Chart of Accounts",
      actual: `accounts=${accounts.length}`,
      recommendedFix: "Review the connector account mapping and confirm whether the provider returned Chart of Accounts data.",
    }), warnings);
  }
  if (supportWarningsAllowed && !hasRows(trialBalance)) {
    add(warning("TRIAL_BALANCE_MISSING", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Trial Balance",
      actual: `trialBalance=${trialBalance.length}`,
      recommendedFix: "Review the connector trial balance mapping and confirm whether the provider returned Trial Balance data.",
    }), warnings);
  }
  if (supportWarningsAllowed && !hasAvailableRows(data?.normalizedARAging)) {
    add(warning("AR_AGING_MISSING", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "AR Aging",
      actual: `arAging=${data?.normalizedARAging?.length || 0}`,
      recommendedFix: "Review AR Aging availability and connector mapping.",
    }), warnings);
  }
  if (supportWarningsAllowed && !hasAvailableRows(data?.normalizedAPAging)) {
    add(warning("AP_AGING_MISSING", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "AP Aging",
      actual: `apAging=${data?.normalizedAPAging?.length || 0}`,
      recommendedFix: "Review AP Aging availability and connector mapping.",
    }), warnings);
  }
  if (supportWarningsAllowed && !hasAvailableRows(data?.normalizedBudgets)) {
    add(warning("BUDGET_MISSING", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Budget",
      actual: `budget=${data?.normalizedBudgets?.length || 0}`,
      recommendedFix: "Review budget report availability and connector mapping.",
    }), warnings);
  }
  for (const [code, affected, rows] of [
    ["DEPARTMENTS_MISSING", "Departments", data?.normalizedDepartments],
    ["CLASSES_MISSING", "Classes", data?.normalizedClasses],
    ["LOCATIONS_MISSING", "Locations", data?.normalizedLocations],
    ["PROJECTS_MISSING", "Projects", data?.normalizedProjects],
  ] as const) {
    if (supportWarningsAllowed && !hasAvailableRows(rows)) {
      add(warning(code, "Some supporting schedules could not be validated. A support ticket was created for review.", {
        affected,
        actual: `${affected}=${rows?.length || 0}`,
        recommendedFix: `Review ${affected.toLowerCase()} availability and connector mapping.`,
      }), warnings);
    }
  }

  const assets = findExplicitTotal(balanceSheet, /^total assets$/i) ?? sumRows(balanceSheet, (row) => sectionIncludes(row, /asset/i) && !/liabilit|equity/i.test(`${row.label} ${row.section}`));
  const liabilities = findExplicitTotal(balanceSheet, /^total liabilities$/i) ?? sumRows(balanceSheet, (row) => sectionIncludes(row, /liabilit/i));
  const equity = findExplicitTotal(balanceSheet, /^total equity$/i) ?? sumRows(balanceSheet, (row) => sectionIncludes(row, /equity/i));
  const balanceVariance = absVariance(assets, liabilities + equity);
  if (hasRows(balanceSheet) && balanceVariance > ROUNDING_TOLERANCE) {
    add(blocker("BALANCE_SHEET_OUT_OF_BALANCE", "Report blocked: balance sheet does not balance.", {
      affected: "Balance Sheet",
      expected: liabilities + equity,
      actual: assets,
      variance: balanceVariance,
    }), blockers);
  }

  const totalDebits = trialBalance.reduce((total, row) => total + amount(row.debit), 0);
  const totalCredits = trialBalance.reduce((total, row) => total + amount(row.credit), 0);
  const trialVariance = absVariance(totalDebits, totalCredits);
  if (hasRows(trialBalance) && trialVariance > ROUNDING_TOLERANCE) {
    add(warning("TRIAL_BALANCE_OUT_OF_BALANCE", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Trial Balance",
      expected: totalCredits,
      actual: totalDebits,
      variance: trialVariance,
      recommendedFix: "Review Trial Balance debit and credit mapping.",
    }), warnings);
  }

  const cashAccountIds = new Set(
    accounts
      .filter((account) => /cash|bank|checking|savings/i.test(`${account.name} ${account.accountType || ""}`))
      .map((account) => account.id),
  );
  const cashPerBalanceSheet = sumRows(balanceSheet, (row) => sectionIncludes(row, /cash|bank|checking|savings/i));
  const cashPerSupportingAccounts = trialBalance
    .filter((row) => cashAccountIds.has(row.accountId) || /cash|bank|checking|savings/i.test(row.accountName))
    .reduce((total, row) => total + Math.abs(amount(row.netAmount || row.debit - row.credit)), 0);
  diagnostics.cashPerBalanceSheet = cashPerBalanceSheet;
  diagnostics.cashPerSupportingAccounts = cashPerSupportingAccounts;
  diagnostics.cashVariance = absVariance(cashPerBalanceSheet, cashPerSupportingAccounts);
  if ((cashPerBalanceSheet || cashPerSupportingAccounts) && diagnostics.cashVariance > ROUNDING_TOLERANCE) {
    add(warning("CASH_SUPPORT_MISMATCH", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Cash",
      expected: cashPerSupportingAccounts,
      actual: cashPerBalanceSheet,
      variance: diagnostics.cashVariance,
      recommendedFix: "Review cash account classification and Trial Balance support.",
    }), warnings);
  }

  const revenue = findExplicitTotal(incomeStatement, /^total (income|revenue|sales)$/i) ?? sumRows(incomeStatement, (row) => sectionIncludes(row, /revenue|income|sales/i) && !/net|gross|operating|other/i.test(String(row.label || "")));
  const expenses = Math.abs(findExplicitTotal(incomeStatement, /^total (expense|expenses|operating expenses|cost)/i) ?? sumRows(incomeStatement, (row) => sectionIncludes(row, /expense|cost|cogs|payroll|materials/i)));
  const netIncome = findExplicitTotal(incomeStatement, /net (income|profit)/i);
  if (hasRows(incomeStatement) && (!Number.isFinite(revenue) || !Number.isFinite(expenses))) {
    add(warning("INCOME_STATEMENT_TOTALS_MISSING", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Income Statement",
      recommendedFix: "Review revenue and expense subtotal mapping.",
    }), warnings);
  }
  if (netIncome !== null) {
    const expectedNetIncome = revenue - expenses;
    const incomeVariance = absVariance(expectedNetIncome, netIncome);
    if (incomeVariance > ROUNDING_TOLERANCE) {
      add(blocker("INCOME_STATEMENT_SUBTOTAL_MISMATCH", "Report blocked: income statement totals are inconsistent.", {
        affected: "Income Statement",
        expected: expectedNetIncome,
        actual: netIncome,
        variance: incomeVariance,
      }), blockers);
    }
  }

  for (const schedule of options.schedules || []) {
    if (!schedule.sourceSystem || schedule.sourceSystem !== context?.sourceSystem || (schedule.connectionId && schedule.connectionId !== context?.connectionId)) {
      add(blocker("SCHEDULE_SOURCE_MISMATCH", "Report blocked: schedule source mismatch detected.", {
        affected: schedule.name,
        expected: `${context?.sourceSystem || "missing"} / ${context?.connectionId || "missing"} / ${context?.syncId || "missing"}`,
        actual: `${schedule.sourceSystem || "missing"} / ${schedule.connectionId || "missing"} / ${schedule.syncId || "missing"}`,
      }), blockers);
    }
    if (schedule.sourceSystem === context?.sourceSystem && (!schedule.connectionId || schedule.connectionId === context?.connectionId) && schedule.syncId && schedule.syncId !== context?.syncId) {
      add(warning("STALE_CONTEXT_SUSPECTED", "Some supporting schedules could not be validated. A support ticket was created for review.", {
        affected: schedule.name,
        expected: context?.syncId || "missing",
        actual: schedule.syncId,
        recommendedFix: "Refresh the active report context from the latest successful sync.",
      }), warnings);
    }
    if (schedule.rows && schedule.rows.length === 0) {
      add(warning("OPTIONAL_SCHEDULE_MISSING", "Some supporting schedules could not be validated. A support ticket was created for review.", {
        affected: schedule.name,
        actual: "rows=0",
        recommendedFix: "Review optional schedule availability and connector mapping.",
      }), warnings);
    }
    if (schedule.reportPeriod && !schedule.reportPeriod.comparative && (schedule.reportPeriod.startDate !== context?.reportPeriod.startDate || schedule.reportPeriod.endDate !== context?.reportPeriod.endDate)) {
      add(warning("REPORT_PERIOD_MISMATCH", "Some supporting schedules could not be validated. A support ticket was created for review.", {
        affected: schedule.name,
        expected: `${context?.reportPeriod.startDate} to ${context?.reportPeriod.endDate}`,
        actual: `${schedule.reportPeriod.startDate} to ${schedule.reportPeriod.endDate}`,
        recommendedFix: "Confirm the package context period before regenerating.",
      }), warnings);
    }
  }

  const lastSyncedAt = data?.lastSyncedAt ? new Date(data.lastSyncedAt).getTime() : 0;
  const staleThresholdMs = (options.staleThresholdHours ?? 24) * 60 * 60 * 1000;
  if (options.requiresLiveData && !options.staleApproved && (!lastSyncedAt || Date.now() - lastSyncedAt > staleThresholdMs)) {
    add(warning("STALE_CONTEXT_SUSPECTED", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Sync",
      expected: `${options.staleThresholdHours ?? 24} hours or newer`,
      actual: data?.lastSyncedAt || "missing",
      recommendedFix: "Refresh or resync the active report context when practical.",
    }), warnings);
  }

  if (isZeroCoreData(context)) {
    if (noActivityConfirmed) {
      add(warning("EMPTY_PROVIDER_DATA", `Connected to ${context?.sourceSystem}, but no financial activity was found for this period.`), warnings);
    } else {
      add(warning("MAPPING_CONFIDENCE_LOW", "Some supporting schedules could not be validated. A support ticket was created for review.", {
        affected: "Core statements",
        recommendedFix: "Confirm the provider returned no financial activity for this period, then regenerate.",
      }), warnings);
    }
  }

  if (options.rawSourceDataRetrieved && (!hasRows(balanceSheet) || !hasRows(incomeStatement))) {
    add(warning("MAPPING_CONFIDENCE_LOW", "Some supporting schedules could not be validated. A support ticket was created for review.", {
      affected: "Normalized financial reports",
      recommendedFix: "Review the provider mapper for the missing normalized statement.",
    }), warnings);
  }

  if (options.fallbackData && (options.fallbackData.sourceSystem !== context?.sourceSystem || options.fallbackData.connectionId !== context?.connectionId)) {
    add(blocker("UNSAFE_FALLBACK", "Report blocked: unsafe fallback data detected.", {
      expected: `${context?.sourceSystem || "missing"} / ${context?.connectionId || "missing"}`,
      actual: `${options.fallbackData.sourceSystem || "missing"} / ${options.fallbackData.connectionId || "missing"}`,
    }), blockers);
  }

  if (!blockers.length) add(info("PREFLIGHT_PASSED", "Report preflight validation passed."), infoItems);

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    info: infoItems,
    sourceSystem: context?.sourceSystem,
    connectionId: context?.connectionId,
    syncId: context?.syncId,
    reportPeriod: context?.reportPeriod,
    diagnostics,
  };
}

export function assertReportPreflight(context: ReportDataContext | null | undefined, options: ReportPreflightOptions = {}) {
  const result = validateReportPreflight(context, options);
  if (!result.passed) {
    const error = new Error("We could not generate this report because the accounting data failed validation. Please review the issues below and sync again.");
    (error as Error & { preflight?: ReportPreflightResult; status?: number }).preflight = result;
    (error as Error & { preflight?: ReportPreflightResult; status?: number }).status = 422;
    throw error;
  }
  return result;
}
