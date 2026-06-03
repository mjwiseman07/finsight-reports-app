import type { AdvisacorNormalizedEntity, AdvisacorNormalizedFinancialData, CanonicalBalanceSheetRow } from "../../integrations/accounting/types";
import { buildMappedFinancialSummary } from "../../integrations/accounting/normalizers/financial-statements";
import { hasAvailableScheduleRows, isNotAvailableRows, totalEntityAmount } from "./fetchSupportingSchedules";

export type AgingBuckets = {
  current: number;
  oneToThirty: number;
  thirtyOneToSixty: number;
  sixtyOneToNinety: number;
  ninetyPlus: number;
  total: number;
};

export type InventoryAnalysisItem = {
  name: string;
  sku: string;
  quantity: number | null;
  unitCost: number | null;
  extendedValue: number;
  category: string;
  inventoryStage: "Raw Materials" | "Work in Process" | "Finished Goods" | "Unclassified Inventory";
  sourceReport: string;
};

export type InventoryAnalysis = {
  industryMode: "retail_wholesale" | "manufacturing" | "generic";
  totalQuantity: number | null;
  totalInventoryValue: number;
  items: InventoryAnalysisItem[];
  balanceSheetInventoryValue: number;
  varianceToBalanceSheet: number;
  tieOutStatus: "Ties to Balance Sheet" | "Variance to Balance Sheet" | "No Balance Sheet Inventory";
  fallbackNote?: string;
};

export type FixedAssetCategory = {
  name: string;
  originalCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  sourceReport: string;
};

export type FixedAssetAnalysis = {
  rows: CanonicalBalanceSheetRow[];
  categories: FixedAssetCategory[];
  originalCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  balanceSheetFixedAssetValue: number;
  varianceToBalanceSheet: number;
  tieOutStatus: "Ties to Balance Sheet" | "Variance to Balance Sheet" | "No Balance Sheet Fixed Assets";
  hasAccumulatedDepreciation: boolean;
};

export type PayrollFteAnalysis = {
  payrollSourceUsed: string;
  payrollAccountsFound: Array<{ name: string; balance: number; sourceReport: string }>;
  payrollCost: number | null;
  payrollCostIsZeroFromSource: boolean;
  revenueUsedForRevenuePerFte: number | null;
  currentFte: number | null;
  currentFteSource: string;
  priorFte: number | null;
  priorFteSource: string;
  payrollCostPerFte: number | null;
  revenuePerFte: number | null;
  payrollGrowth: number | null;
  sourceStatus: string;
};

export type SchedulePopulationFailure = {
  code: "SCHEDULE_POPULATION_FAILURE";
  schedule: "AR Aging" | "AP Aging" | "Inventory Analysis" | "Fixed Asset Analysis";
  balanceSheetAmount: number;
  scheduleAmount: number;
  message: string;
};

function amount(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function text(value: unknown) {
  return String(value || "").trim();
}

function rowText(row: AdvisacorNormalizedEntity | CanonicalBalanceSheetRow) {
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  const label = "name" in row ? row.name : row.label;
  const section = "label" in row ? row.section || "" : row.type || "";
  return `${label} ${section} ${raw?.label || ""} ${raw?.__advisacorSourceSection || ""} ${raw?.Title || ""}`.toLowerCase();
}

function entityAmount(row: AdvisacorNormalizedEntity) {
  return amount(row.amount ?? row.balance);
}

function metadataAmount(row: AdvisacorNormalizedEntity, key: string) {
  return amount(row.metadata?.[key]);
}

function finiteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function nonPlaceholderEntities(rows: AdvisacorNormalizedEntity[] = []) {
  return rows.filter((row) => row.type !== "not_available" && !String(row.id || "").endsWith(":not_available"));
}

function sumBalanceSheetRows(rows: CanonicalBalanceSheetRow[] = [], pattern: RegExp, includeTotals = false) {
  return rows
    .filter((row) => pattern.test(`${row.label} ${row.section || ""}`) && (includeTotals || !/^total\b/i.test(row.label)))
    .reduce((total, row) => total + amount(row.amount), 0);
}

function explicitBalanceSheetTotal(rows: CanonicalBalanceSheetRow[] = [], pattern: RegExp) {
  const match = rows.find((row) => /^total\b/i.test(row.label) && pattern.test(row.label));
  return match ? amount(match.amount) : null;
}

function fixedAssetText(row: CanonicalBalanceSheetRow) {
  return rowText(row);
}

function isFixedAssetRow(row: CanonicalBalanceSheetRow) {
  return /fixed asset|non.?current asset|other asset|property|plant|ppe|equipment|furniture|computer|office equipment|truck|vehicle|machinery|leasehold|original cost|accumulated depreciation|depreciation/i.test(fixedAssetText(row));
}

function isAccumulatedDepreciationRow(row: CanonicalBalanceSheetRow) {
  return /accumulated depreciation|accum depreciation|contra asset/i.test(fixedAssetText(row));
}

function isFixedAssetTotalRow(row: CanonicalBalanceSheetRow) {
  return /^total\b/i.test(row.label);
}

function fixedAssetCategoryName(row: CanonicalBalanceSheetRow) {
  const raw = row.source?.raw as Record<string, unknown> | undefined;
  const rawPath = Array.isArray(raw?.__advisacorHierarchyPath) ? raw.__advisacorHierarchyPath.map(text).filter(Boolean) : [];
  const label = text(row.label);
  const section = text(row.section);
  if (/original cost|cost|accumulated depreciation|depreciation/i.test(label)) {
    return rawPath.length > 1 ? rawPath[rawPath.length - 2] : section || label;
  }
  return section && !/^fixed assets?|non.?current assets?|property,? plant|ppe$/i.test(section) ? section : label;
}

function balanceSheetFixedAssetTotal(rows: CanonicalBalanceSheetRow[] = []) {
  const explicitTotal = explicitBalanceSheetTotal(rows, /^total fixed assets$|^total property and equipment$|^net property and equipment$/i);
  if (explicitTotal !== null) return explicitTotal;
  const costRows = rows.filter((row) => isFixedAssetRow(row) && !isAccumulatedDepreciationRow(row) && !isFixedAssetTotalRow(row));
  const depreciationRows = rows.filter((row) => isAccumulatedDepreciationRow(row) && !isFixedAssetTotalRow(row));
  if (!depreciationRows.length) return costRows.reduce((sum, row) => sum + amount(row.amount), 0);
  const grossCost = costRows.reduce((sum, row) => sum + Math.abs(amount(row.amount)), 0);
  const accumulatedDepreciation = depreciationRows.reduce((sum, row) => sum + amount(row.amount), 0);
  return grossCost + accumulatedDepreciation;
}

function agingBucketFor(row: AdvisacorNormalizedEntity) {
  const value = rowText(row);
  if (/90\+|over 90|91|older than 90|>90/.test(value)) return "ninetyPlus";
  if (/61[\s-]*90|60[\s-]*90|61 to 90/.test(value)) return "sixtyOneToNinety";
  if (/31[\s-]*60|30[\s-]*60|31 to 60/.test(value)) return "thirtyOneToSixty";
  if (/1[\s-]*30|current month|one to thirty|1 to 30/.test(value)) return "oneToThirty";
  if (/current|not yet due|0[\s-]*30/.test(value)) return "current";
  return null;
}

export function agingBuckets(rows: AdvisacorNormalizedEntity[] = []): AgingBuckets {
  const realRows = nonPlaceholderEntities(rows);
  const buckets: AgingBuckets = {
    current: 0,
    oneToThirty: 0,
    thirtyOneToSixty: 0,
    sixtyOneToNinety: 0,
    ninetyPlus: 0,
    total: 0,
  };
  let explicitTotal: number | null = null;
  for (const row of realRows) {
    const value = entityAmount(row);
    const label = rowText(row);
    if (/^total\b|total ar|total ap|total accounts receivable|total accounts payable/.test(label)) {
      explicitTotal = Math.max(explicitTotal || 0, Math.abs(value));
      continue;
    }
    const bucket = agingBucketFor(row);
    if (bucket) buckets[bucket] += Math.abs(value);
  }
  const bucketTotal = buckets.current + buckets.oneToThirty + buckets.thirtyOneToSixty + buckets.sixtyOneToNinety + buckets.ninetyPlus;
  const rowTotal = Math.abs(totalEntityAmount(realRows));
  buckets.total = explicitTotal ?? (bucketTotal > 0 ? bucketTotal : rowTotal);
  if (bucketTotal <= 0 && buckets.total > 0) buckets.current = buckets.total;
  return buckets;
}

export function balanceSheetScheduleAmounts(data?: AdvisacorNormalizedFinancialData | null) {
  const balanceSheet = data?.normalizedBalanceSheet || [];
  const currentAssets = explicitBalanceSheetTotal(balanceSheet, /^total current assets$/i) ?? sumBalanceSheetRows(balanceSheet, /current asset|cash|bank|checking|savings|accounts receivable|\bar\b|inventory|prepaid/i);
  const currentLiabilities = explicitBalanceSheetTotal(balanceSheet, /^total current liabilities$/i) ?? sumBalanceSheetRows(balanceSheet, /current liabilit|accounts payable|\bap\b|credit card|sales tax|payroll payable/i);
  const totalAssets = explicitBalanceSheetTotal(balanceSheet, /^total assets$/i) ?? sumBalanceSheetRows(balanceSheet, /asset|cash|bank|receivable|inventory|equipment|furniture|truck|vehicle|property/i);
  const totalLiabilities = explicitBalanceSheetTotal(balanceSheet, /^total liabilities$/i) ?? sumBalanceSheetRows(balanceSheet, /liabilit|accounts payable|\bap\b|loan|debt|credit card/i);
  const totalEquity = explicitBalanceSheetTotal(balanceSheet, /^total equity$/i) ?? sumBalanceSheetRows(balanceSheet, /equity|retained earnings|current year earnings/i, true);
  const inventory = sumBalanceSheetRows(balanceSheet, /inventory/i);
  const accountsReceivable = sumBalanceSheetRows(balanceSheet, /accounts receivable|\breceivables\b|\bar\b/i);
  const accountsPayable = sumBalanceSheetRows(balanceSheet, /accounts payable|\bpayables\b|\bap\b/i);
  const fixedAssets = balanceSheetFixedAssetTotal(balanceSheet);
  const accumulatedDepreciation = sumBalanceSheetRows(balanceSheet, /accumulated depreciation/i);
  return {
    currentAssets,
    currentLiabilities,
    totalAssets,
    totalLiabilities,
    totalEquity,
    inventory,
    accountsReceivable,
    accountsPayable,
    fixedAssets,
    accumulatedDepreciation,
  };
}

export function inventorySchedule(data?: AdvisacorNormalizedFinancialData | null) {
  return inventoryAnalysis(data);
}

function inventoryStageFor(value: string): InventoryAnalysisItem["inventoryStage"] {
  if (/raw materials?|raw material inventory|materials\b/i.test(value)) return "Raw Materials";
  if (/\bwip\b|work[\s-]?in[\s-]?process/i.test(value)) return "Work in Process";
  if (/finished goods?|finished goods inventory/i.test(value)) return "Finished Goods";
  return "Unclassified Inventory";
}

function industryMode(industryType?: string): InventoryAnalysis["industryMode"] {
  const value = String(industryType || "").toLowerCase();
  if (/manufactur|production|factory/.test(value)) return "manufacturing";
  if (/retail|wholesale|distribution|distributor|inventory/.test(value)) return "retail_wholesale";
  return "generic";
}

export function inventoryAnalysis(data?: AdvisacorNormalizedFinancialData | null, industryType?: string): InventoryAnalysis {
  const rows = nonPlaceholderEntities(data?.normalizedTransactions || []).filter((row) => /inventory|item|stock|valuation|part/i.test(rowText(row) || row.source?.sourceReport || ""));
  const balanceSheetInventoryValue = Math.abs(balanceSheetScheduleAmounts(data).inventory);
  const items = rows
    .filter((row) => !/^total\b/i.test(row.name))
    .map((row) => {
      const quantityValue = metadataAmount(row, "inventoryQuantity");
      const extendedValue = Math.abs(metadataAmount(row, "inventoryExtendedValue") || entityAmount(row));
      const unitCostValue = metadataAmount(row, "inventoryUnitCost") || (quantityValue ? extendedValue / quantityValue : 0);
      const category = text(row.type || row.metadata?.source_section || "Inventory");
      return {
        name: row.name,
        sku: text(row.metadata?.inventorySku),
        quantity: quantityValue || null,
        unitCost: unitCostValue || null,
        extendedValue,
        category,
        inventoryStage: inventoryStageFor(`${row.name} ${category}`),
        sourceReport: row.source?.sourceReport || "",
      };
    })
    .filter((item) => item.name && item.extendedValue > 0);
  const itemTotal = items.reduce((sum, item) => sum + item.extendedValue, 0);
  const totalInventoryValue = itemTotal > 0 ? itemTotal : balanceSheetInventoryValue;
  const totalQuantity = items.some((item) => item.quantity !== null)
    ? items.reduce((sum, item) => sum + amount(item.quantity), 0)
    : null;
  const fallbackItems = !items.length && balanceSheetInventoryValue > 0
    ? [{
        name: "Inventory Asset",
        sku: "",
        quantity: null,
        unitCost: null,
        extendedValue: balanceSheetInventoryValue,
        category: "Inventory Asset",
        inventoryStage: "Unclassified Inventory" as const,
        sourceReport: "Balance Sheet",
      }]
    : items;
  const varianceToBalanceSheet = totalInventoryValue - balanceSheetInventoryValue;
  const tieOutStatus =
    balanceSheetInventoryValue <= 0
      ? "No Balance Sheet Inventory"
      : Math.abs(varianceToBalanceSheet) <= 1
        ? "Ties to Balance Sheet"
        : "Variance to Balance Sheet";
  return {
    industryMode: industryMode(industryType),
    totalQuantity,
    totalInventoryValue,
    items: fallbackItems,
    balanceSheetInventoryValue,
    varianceToBalanceSheet,
    tieOutStatus,
    fallbackNote: !items.length && balanceSheetInventoryValue > 0
      ? "Item-level inventory detail was not available from the connected accounting system. Balance shown agrees to Balance Sheet."
      : undefined,
  };
}

export function fixedAssetSchedule(data?: AdvisacorNormalizedFinancialData | null): FixedAssetAnalysis {
  const balanceSheetRows = data?.normalizedBalanceSheet || [];
  const fixedRows = balanceSheetRows.filter((row) => isFixedAssetRow(row) && !isFixedAssetTotalRow(row));
  const costRows = fixedRows.filter((row) => !isAccumulatedDepreciationRow(row));
  const depreciationRows = fixedRows.filter(isAccumulatedDepreciationRow);
  const categoryMap = new Map<string, FixedAssetCategory>();
  for (const row of costRows) {
    const name = fixedAssetCategoryName(row) || "Fixed Assets";
    const current = categoryMap.get(name) || {
      name,
      originalCost: 0,
      accumulatedDepreciation: 0,
      netBookValue: 0,
      sourceReport: row.source?.sourceReport || "Balance Sheet",
    };
    current.originalCost += amount(row.amount);
    current.netBookValue = current.originalCost + current.accumulatedDepreciation;
    categoryMap.set(name, current);
  }
  for (const row of depreciationRows) {
    const name = fixedAssetCategoryName(row) || "Fixed Assets";
    const current = categoryMap.get(name) || {
      name,
      originalCost: 0,
      accumulatedDepreciation: 0,
      netBookValue: 0,
      sourceReport: row.source?.sourceReport || "Balance Sheet",
    };
    current.accumulatedDepreciation += amount(row.amount);
    current.netBookValue = current.originalCost + current.accumulatedDepreciation;
    categoryMap.set(name, current);
  }
  let categories = Array.from(categoryMap.values()).filter((row) => Math.abs(row.originalCost) > 0.005 || Math.abs(row.accumulatedDepreciation) > 0.005);
  const balanceSheetFixedAssetValue = Math.abs(balanceSheetScheduleAmounts(data).fixedAssets);
  if (!categories.length && balanceSheetFixedAssetValue > 0) {
    categories = [{
      name: "Fixed Assets",
      originalCost: balanceSheetFixedAssetValue,
      accumulatedDepreciation: 0,
      netBookValue: balanceSheetFixedAssetValue,
      sourceReport: "Balance Sheet",
    }];
  }
  const originalCost = categories.reduce((sum, row) => sum + row.originalCost, 0);
  const accumulatedDepreciation = categories.reduce((sum, row) => sum + row.accumulatedDepreciation, 0);
  const netBookValue = categories.reduce((sum, row) => sum + row.netBookValue, 0);
  const hasAccumulatedDepreciation =
    depreciationRows.length > 0 ||
    (data?.normalizedTrialBalance || []).some((row) => /accumulated depreciation|depreciation expense/i.test(`${row.accountName}`) && Math.abs(amount(row.netAmount || row.debit - row.credit)) > 0.005);
  const varianceToBalanceSheet = netBookValue - balanceSheetFixedAssetValue;
  const tieOutStatus =
    balanceSheetFixedAssetValue <= 0
      ? "No Balance Sheet Fixed Assets"
      : Math.abs(varianceToBalanceSheet) <= 1
        ? "Ties to Balance Sheet"
        : "Variance to Balance Sheet";
  return {
    rows: fixedRows,
    categories,
    originalCost,
    accumulatedDepreciation,
    netBookValue,
    balanceSheetFixedAssetValue,
    varianceToBalanceSheet,
    tieOutStatus,
    hasAccumulatedDepreciation,
  };
}

function isPayrollAccountText(value: string) {
  return /payroll|wages?|salar(y|ies)|\blabor\b|payroll taxes?|employee benefits?|contract labor|officer compensation/i.test(value);
}

function payrollFteValue(data: AdvisacorNormalizedFinancialData | null | undefined, keys: string[]) {
  const metadata = ((data as unknown as { metadata?: Record<string, unknown>; companyInputs?: Record<string, unknown>; userInputs?: Record<string, unknown> })?.metadata || {}) as Record<string, unknown>;
  const companyInputs = ((data as unknown as { companyInputs?: Record<string, unknown> })?.companyInputs || {}) as Record<string, unknown>;
  const userInputs = ((data as unknown as { userInputs?: Record<string, unknown> })?.userInputs || {}) as Record<string, unknown>;
  for (const source of [userInputs, companyInputs, metadata]) {
    for (const key of keys) {
      const value = finiteNumber(source[key]);
      if (value !== null) {
        const sourceName = source === userInputs ? "User-entered FTE" : source === companyInputs ? "User-entered company inputs" : "User-entered metadata";
        return { value, source: sourceName };
      }
    }
  }
  return { value: null, source: "Not available" };
}

export function payrollFteAnalysis(data?: AdvisacorNormalizedFinancialData | null): PayrollFteAnalysis {
  const incomeStatementRows = data?.normalizedIncomeStatement || [];
  const trialBalanceRows = data?.normalizedTrialBalance || [];
  const accountRows = data?.normalizedAccounts || [];
  const accountNames = new Map(accountRows.map((row) => [row.id, `${row.name} ${row.accountType || ""} ${row.accountClass || ""}`]));
  const payrollRows = incomeStatementRows
    .filter((row) => isPayrollAccountText(`${row.label} ${row.section || ""}`) && !/^total\b/i.test(row.label))
    .map((row) => ({ name: row.label, balance: Math.abs(amount(row.amount)), sourceReport: row.source?.sourceReport || "ProfitAndLoss" }))
    .filter((row) => Boolean(row.name));
  const trialBalancePayrollRows = trialBalanceRows
    .filter((row) => isPayrollAccountText(`${row.accountName} ${accountNames.get(row.accountId) || ""}`))
    .map((row) => ({ name: row.accountName, balance: Math.abs(amount(row.netAmount || row.debit - row.credit)), sourceReport: row.source?.sourceReport || "TrialBalance" }))
    .filter((row) => Boolean(row.name));
  const payrollAccountsFound = payrollRows.length ? payrollRows : trialBalancePayrollRows;
  const payrollCost = payrollAccountsFound.length ? payrollAccountsFound.reduce((sum, row) => sum + row.balance, 0) : null;
  const revenue = Math.abs(buildMappedFinancialSummary(data?.normalizedBalanceSheet || [], incomeStatementRows).revenue || 0);
  const currentFte = payrollFteValue(data, ["currentFte", "current_fte", "fte", "employeeCount", "employee_count"]);
  const priorFte = payrollFteValue(data, ["priorFte", "prior_fte", "previousFte", "previous_fte"]);
  const payrollCostPerFte = payrollCost !== null && currentFte.value && currentFte.value > 0 ? payrollCost / currentFte.value : null;
  const revenuePerFte = revenue > 0 && currentFte.value && currentFte.value > 0 ? revenue / currentFte.value : null;
  const providerLabel = data?.sourceSystem === "quickbooks" ? "QuickBooks" : data?.sourceSystem === "xero" ? "Xero" : "Accounting";
  return {
    payrollSourceUsed: payrollAccountsFound.length ? `${providerLabel} P&L payroll expense accounts` : "Not available",
    payrollAccountsFound,
    payrollCost,
    payrollCostIsZeroFromSource: payrollAccountsFound.length > 0 && Math.abs(payrollCost || 0) <= 0.005,
    revenueUsedForRevenuePerFte: revenue > 0 ? revenue : null,
    currentFte: currentFte.value,
    currentFteSource: currentFte.source,
    priorFte: priorFte.value,
    priorFteSource: priorFte.source,
    payrollCostPerFte,
    revenuePerFte,
    payrollGrowth: null,
    sourceStatus: payrollAccountsFound.length ? `Source: ${providerLabel} P&L payroll expense accounts` : "Source: Not available",
  };
}

export function ratioSchedule(data?: AdvisacorNormalizedFinancialData | null) {
  const bs = balanceSheetScheduleAmounts(data);
  const quickAssets = bs.currentAssets - Math.max(bs.inventory, 0);
  return {
    ...bs,
    workingCapital: bs.currentAssets - bs.currentLiabilities,
    currentRatio: bs.currentLiabilities ? bs.currentAssets / bs.currentLiabilities : null,
    quickRatio: bs.currentLiabilities ? quickAssets / bs.currentLiabilities : null,
    debtToEquity: bs.totalEquity ? bs.totalLiabilities / bs.totalEquity : null,
    debtToAssets: bs.totalAssets ? bs.totalLiabilities / bs.totalAssets : null,
  };
}

export function schedulePopulationFailures(data?: AdvisacorNormalizedFinancialData | null): SchedulePopulationFailure[] {
  const bs = balanceSheetScheduleAmounts(data);
  const arAging = agingBuckets(data?.normalizedARAging || []);
  const apAging = agingBuckets(data?.normalizedAPAging || []);
  const inventory = inventorySchedule(data);
  const fixedAssets = fixedAssetSchedule(data);
  const failures: SchedulePopulationFailure[] = [];
  const add = (schedule: SchedulePopulationFailure["schedule"], balanceSheetAmount: number, scheduleAmount: number, unavailable = false) => {
    if (!unavailable && Math.abs(balanceSheetAmount) > 0.005 && Math.abs(scheduleAmount) <= 0.005) {
      failures.push({
        code: "SCHEDULE_POPULATION_FAILURE",
        schedule,
        balanceSheetAmount,
        scheduleAmount,
        message: `${schedule} did not populate even though the Balance Sheet contains a related balance.`,
      });
    }
  };
  add("AR Aging", bs.accountsReceivable, arAging.total, isNotAvailableRows(data?.normalizedARAging));
  add("AP Aging", bs.accountsPayable, apAging.total, isNotAvailableRows(data?.normalizedAPAging));
  add("Inventory Analysis", bs.inventory, inventory.totalInventoryValue, isNotAvailableRows(data?.normalizedTransactions));
  add("Fixed Asset Analysis", bs.fixedAssets, fixedAssets.netBookValue || fixedAssets.originalCost);
  return failures;
}

export function buildScheduleDiagnostics(data?: AdvisacorNormalizedFinancialData | null) {
  const arAging = agingBuckets(data?.normalizedARAging || []);
  const apAging = agingBuckets(data?.normalizedAPAging || []);
  const inventory = inventorySchedule(data);
  const fixedAssets = fixedAssetSchedule(data);
  const ratios = ratioSchedule(data);
  return {
    provider: data?.sourceSystem || null,
    companyId: data?.companyId || null,
    connectionId: data?.connectionId || null,
    selectedPeriod: data?.reportPeriod || null,
    schedules: [
      {
        name: "AR Aging",
        sourceReportName: data?.sourceSystem === "xero" ? "Reports/AgedReceivablesByContact" : "AccountsReceivableAgingSummary",
        rawData: (data?.normalizedARAging || []).map((row) => row.source?.raw || row),
        normalizedData: data?.normalizedARAging || [],
        pdfPayload: arAging,
        rowCount: hasAvailableScheduleRows(data?.normalizedARAging) ? data?.normalizedARAging?.length || 0 : 0,
        totalAmount: arAging.total,
      },
      {
        name: "AP Aging",
        sourceReportName: data?.sourceSystem === "xero" ? "Reports/AgedPayablesByContact" : "AccountsPayableAgingSummary",
        rawData: (data?.normalizedAPAging || []).map((row) => row.source?.raw || row),
        normalizedData: data?.normalizedAPAging || [],
        pdfPayload: apAging,
        rowCount: hasAvailableScheduleRows(data?.normalizedAPAging) ? data?.normalizedAPAging?.length || 0 : 0,
        totalAmount: apAging.total,
      },
      {
        name: "Inventory Analysis",
        sourceReportName: data?.sourceSystem === "xero" ? "Xero inventory/balance sheet fallback" : "InventoryValuationSummary",
        rawData: (data?.normalizedTransactions || []).map((row) => row.source?.raw || row),
        normalizedData: inventory.items,
        pdfPayload: inventory,
        rowCount: inventory.items.length,
        totalAmount: inventory.totalInventoryValue,
      },
      {
        name: "Fixed Asset Analysis",
        sourceReportName: "Balance Sheet fixed asset accounts",
        rawData: fixedAssets.rows.map((row) => row.source?.raw || row),
        normalizedData: fixedAssets.categories,
        pdfPayload: fixedAssets,
        rowCount: fixedAssets.categories.length,
        totalAmount: fixedAssets.netBookValue,
      },
      {
        name: "Balance Sheet Ratios",
        sourceReportName: "Balance Sheet",
        rawData: data?.normalizedBalanceSheet || [],
        normalizedData: ratios,
        pdfPayload: ratios,
        rowCount: data?.normalizedBalanceSheet?.length || 0,
        totalAmount: ratios.totalAssets,
      },
    ],
    failures: schedulePopulationFailures(data),
    notAvailable: {
      arAging: isNotAvailableRows(data?.normalizedARAging),
      apAging: isNotAvailableRows(data?.normalizedAPAging),
      inventory: isNotAvailableRows(data?.normalizedTransactions),
    },
  };
}
