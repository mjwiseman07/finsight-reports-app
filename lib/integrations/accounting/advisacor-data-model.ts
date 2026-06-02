import type {
  AccountingConnectionRecord,
  AdvisacorNormalizedEntity,
  AdvisacorNormalizedFinancialData,
  AccountingMappingAdapterName,
  CanonicalReportBundle,
  CanonicalSourceMetadata,
  AccountingDateRange,
} from "./types";
import { buildMappedFinancialSummary } from "./normalizers/financial-statements";

const REQUIRED_REPORTING_OBJECTS: Array<keyof AdvisacorNormalizedFinancialData> = [
  "normalizedBalanceSheet",
  "normalizedIncomeStatement",
];

function emptyEntities(source: CanonicalSourceMetadata): AdvisacorNormalizedEntity[] {
  return [
    {
      id: `${source.provider}:not_available`,
      name: "Not available from current normalized sync",
      type: "not_available",
      metadata: { source_note: "Connector did not provide this normalized object in the current sync." },
      source,
    },
  ];
}

function normalizedEntitiesOrUnavailable(rows: AdvisacorNormalizedEntity[] | undefined, source: CanonicalSourceMetadata) {
  return rows?.length ? rows : emptyEntities(source);
}

function sourceForBundle(bundle: CanonicalReportBundle): CanonicalSourceMetadata {
  return {
    ...bundle.sourceMetadata,
    provider: bundle.provider,
    providerFamily: bundle.sourceMetadata.providerFamily || bundle.provider,
    providerProduct: bundle.sourceMetadata.providerProduct || bundle.provider,
    externalEntityId: bundle.entity?.externalId || bundle.sourceMetadata.externalEntityId,
  };
}

function buildEmptyXeroBalanceSheetRows(source: CanonicalSourceMetadata) {
  return [
    { label: "Assets", amount: 0, section: "Assets", source },
    { label: "Liabilities", amount: 0, section: "Liabilities", source },
    { label: "Equity", amount: 0, section: "Equity", source },
  ];
}

function buildEmptyXeroIncomeStatementRows(source: CanonicalSourceMetadata) {
  return [
    { label: "Revenue", amount: 0, section: "Revenue", source },
    { label: "Expenses", amount: 0, section: "Expenses", source },
  ];
}

export function buildAdvisacorNormalizedFinancialData({
  connection,
  bundle,
  adapterName,
  syncId,
  reportPeriod,
  tenantId,
  tenantName,
  mappedAt = new Date().toISOString(),
}: {
  connection: AccountingConnectionRecord;
  bundle: CanonicalReportBundle;
  adapterName: AccountingMappingAdapterName;
  syncId: string;
  reportPeriod: AccountingDateRange;
  tenantId: string | null;
  tenantName: string;
  mappedAt?: string;
}): AdvisacorNormalizedFinancialData {
  const source = sourceForBundle(bundle);
  const xeroDiagnostics = (bundle.sourceMetadata.raw as Record<string, unknown> | undefined)?.diagnostics as Record<string, unknown> | undefined;
  const xeroNormalizationErrors = Array.isArray(xeroDiagnostics?.xeroNormalizationErrors) ? xeroDiagnostics.xeroNormalizationErrors : [];
  const isEmptyXeroFinancialActivity =
    connection.provider === "xero" &&
    xeroNormalizationErrors.length === 0 &&
    !bundle.chartOfAccounts?.length &&
    !bundle.trialBalance?.length &&
    !bundle.normalizedTransactions?.length &&
    !bundle.balanceSheet?.length &&
    !bundle.profitAndLoss?.length;
  const normalizedData: AdvisacorNormalizedFinancialData = {
    sourceSystem: connection.provider,
    adapterName,
    companyId: connection.metadata_json?.company_id ? String(connection.metadata_json.company_id) : null,
    connectionId: connection.id,
    tenantId,
    tenantName,
    syncId,
    reportPeriod,
    mappedAt,
    rawReportsPulled: {
      accounts: Boolean(bundle.chartOfAccounts?.length),
      trialBalance: Boolean(bundle.trialBalance?.length),
      balanceSheet: Boolean(bundle.balanceSheet?.length),
      incomeStatement: Boolean(bundle.profitAndLoss?.length),
      arAging: Boolean(bundle.normalizedARAging?.length),
      apAging: Boolean(bundle.normalizedAPAging?.length),
    },
    syncStatus: "RUNNING",
    lastSyncedAt: mappedAt,
    normalizedAccounts: bundle.chartOfAccounts || [],
    normalizedTransactions: isEmptyXeroFinancialActivity ? [] : normalizedEntitiesOrUnavailable(bundle.normalizedTransactions, source),
    normalizedTrialBalance: bundle.trialBalance || [],
    normalizedBalanceSheet: isEmptyXeroFinancialActivity ? buildEmptyXeroBalanceSheetRows(source) : bundle.balanceSheet || [],
    normalizedIncomeStatement: isEmptyXeroFinancialActivity ? buildEmptyXeroIncomeStatementRows(source) : bundle.profitAndLoss || [],
    normalizedARAging: normalizedEntitiesOrUnavailable(bundle.normalizedARAging, source),
    normalizedAPAging: normalizedEntitiesOrUnavailable(bundle.normalizedAPAging, source),
    normalizedBudgets: normalizedEntitiesOrUnavailable(bundle.normalizedBudgets, source),
    normalizedDepartments: normalizedEntitiesOrUnavailable(bundle.normalizedDepartments, source),
    normalizedLocations: normalizedEntitiesOrUnavailable(bundle.normalizedLocations, source),
    normalizedClasses: normalizedEntitiesOrUnavailable(bundle.normalizedClasses, source),
    normalizedProjects: normalizedEntitiesOrUnavailable(bundle.normalizedProjects, source),
    normalizedVendors: normalizedEntitiesOrUnavailable(bundle.normalizedVendors, source),
    normalizedCustomers: normalizedEntitiesOrUnavailable(bundle.normalizedCustomers, source),
    validation: {
      readyForReporting: false,
      missingObjects: [],
      warnings: [],
    },
  };

  const validation = validateAdvisacorNormalizedFinancialData(normalizedData);
  return {
    ...normalizedData,
    syncStatus: validation.readyForReporting ? "SUCCESS" : "FAILED",
    validation: isEmptyXeroFinancialActivity
      ? {
          ...validation,
          warnings: [...validation.warnings, "Connected to Xero. No financial activity found."],
        }
      : validation,
  };
}

export function validateAdvisacorNormalizedFinancialData(data: AdvisacorNormalizedFinancialData) {
  const missingObjects = REQUIRED_REPORTING_OBJECTS.filter((key) => {
    const value = data[key];
    return !Array.isArray(value) || value.length === 0;
  }).map((key) => String(key));
  const mappedSummary = buildMappedFinancialSummary(data.normalizedBalanceSheet || [], data.normalizedIncomeStatement || []);

  const optionalObjects: Array<keyof AdvisacorNormalizedFinancialData> = [
    "normalizedAccounts",
    "normalizedTransactions",
    "normalizedTrialBalance",
    "normalizedARAging",
    "normalizedAPAging",
    "normalizedBudgets",
    "normalizedDepartments",
    "normalizedLocations",
    "normalizedClasses",
    "normalizedProjects",
    "normalizedVendors",
    "normalizedCustomers",
  ];

  const warnings = optionalObjects
    .filter((key) => {
      const value = data[key];
      return !Array.isArray(value) || value.length === 0;
    })
    .map((key) => `${String(key)} was not populated by ${data.sourceSystem} during this sync.`);
  if (!mappedSummary.balanceSheetValid) {
    warnings.push("Balance Sheet totals did not validate within $1 tolerance.");
  }
  if (!mappedSummary.incomeStatementValid) {
    warnings.push("Income Statement net income did not validate within $1 tolerance.");
  }

  return {
    readyForReporting: missingObjects.length === 0 && mappedSummary.balanceSheetValid && mappedSummary.incomeStatementValid,
    missingObjects,
    warnings,
  };
}

export function assertReadyForSourceAgnosticOutputs(data: AdvisacorNormalizedFinancialData) {
  const validation = validateAdvisacorNormalizedFinancialData(data);
  if (!validation.readyForReporting) {
    throw new Error(`Normalized Advisacor financial data is incomplete: ${validation.missingObjects.join(", ")}`);
  }
  return validation;
}
