import { QuickBooksAdapter } from "../../../erp-adapters/quickbooks-adapter";
import { buildCertificationFixtureReportBundle } from "../normalizers/certification-fixtures";
import { normalizeAccounts } from "../normalizers/accounts";
import { emptyReportBundle, normalizeTabularReportRows } from "../normalizers/reports";
import type {
  AccountingProviderAdapter,
  AdvisacorNormalizedEntity,
  CanonicalChartOfAccountsItem,
  CanonicalTrialBalanceRow,
  ConnectedAccountingEntity,
  ProviderCapabilities,
  ProviderRequestParams,
} from "../types";
import { availabilityFromRows, notAvailableSchedule } from "../../../accounting/supporting-schedules/fetchSupportingSchedules";

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  const raw = String(value ?? "0").trim();
  const isNegative = /^\(.*\)$/.test(raw) || /^-/.test(raw);
  const normalized = raw.replace(/[($,\s)]/g, "").replace(/^-/, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return isNegative ? -amount : amount;
}

function quickBooksColValue(col: unknown) {
  const record = col as Record<string, unknown> | undefined;
  return String(record?.value ?? record?.Value ?? "");
}

function flattenQuickBooksReportRows(rows: unknown[] = [], section = ""): Array<{ label: string; amount: number; section: string; raw: unknown; colValues: string[] }> {
  return rows.flatMap((row) => {
    const record = row as Record<string, unknown>;
    const header = record.Header as Record<string, unknown> | undefined;
    const summary = record.Summary as Record<string, unknown> | undefined;
    const colData = Array.isArray(record.ColData) ? record.ColData : [];
    const headerColData = Array.isArray(header?.ColData) ? header.ColData as unknown[] : [];
    const summaryColData = Array.isArray(summary?.ColData) ? summary.ColData as unknown[] : [];
    const nextSection = quickBooksColValue(headerColData[0]) || String(record.group || record.Group || section || "");
    const children = Array.isArray((record.Rows as Record<string, unknown> | undefined)?.Row)
      ? flattenQuickBooksReportRows((record.Rows as Record<string, unknown>).Row as unknown[], nextSection || section)
      : [];
    const label = quickBooksColValue(colData[0]);
    const colValues = colData.map(quickBooksColValue);
    const amount = parseAmount(colData.length > 1 ? quickBooksColValue(colData[colData.length - 1]) : 0);
    const summaryLabel = quickBooksColValue(summaryColData[0]);
    const summaryAmount = parseAmount(summaryColData.length > 1 ? quickBooksColValue(summaryColData[summaryColData.length - 1]) : 0);
    const current = label ? [{ label, amount, section: nextSection || section, raw: row, colValues }] : [];
    const summaryRow = summaryLabel ? [{ label: summaryLabel, amount: summaryAmount, section: nextSection || section, raw: summary, colValues: summaryColData.map(quickBooksColValue) }] : [];
    return [...current, ...children, ...summaryRow];
  });
}

function quickBooksInventoryMetadata(sourceReport: string, row: { label: string; amount: number; colValues?: string[] }) {
  if (!/inventory/i.test(sourceReport)) return {};
  const values = row.colValues || [];
  const numericValues = values
    .slice(1)
    .map((value) => String(value || "").trim())
    .filter((value) => /^-?\(?\$?[\d,]+(\.\d+)?\)?$/.test(value.replace(/\s/g, "")))
    .map(parseAmount);
  const quantity = numericValues[0] ?? 0;
  const extendedValue = numericValues.length >= 2 ? numericValues[numericValues.length - 2] : row.amount;
  const unitCost = numericValues.length >= 2 ? numericValues[numericValues.length - 1] : quantity ? extendedValue / quantity : 0;
  return {
    inventoryQuantity: quantity,
    inventoryUnitCost: unitCost,
    inventoryExtendedValue: extendedValue,
    inventorySku: values.length > 4 ? values[1] : "",
  };
}

function quickBooksEntity(sourceReport: string, row: { label: string; amount: number; section: string; raw: unknown; colValues?: string[] }, externalEntityId?: string, index = 0): AdvisacorNormalizedEntity {
  const inventoryMetadata = quickBooksInventoryMetadata(sourceReport, row);
  const inventoryAmount = Number((inventoryMetadata as Record<string, unknown>).inventoryExtendedValue || 0);
  const amount = /inventory/i.test(sourceReport) && inventoryAmount ? inventoryAmount : row.amount;
  return {
    id: `quickbooks:${sourceReport}:${index}:${row.label}`,
    name: row.label,
    type: row.section || sourceReport,
    amount,
    balance: amount,
    metadata: { source_system: "quickbooks", source_section: row.section, ...inventoryMetadata },
    source: {
      provider: "quickbooks",
      providerFamily: "intuit",
      providerProduct: "quickbooks_online",
      externalEntityId,
      sourceReport,
      raw: row.raw,
    },
  };
}

function normalizeQuickBooksReportEntities(sourceReport: string, report: unknown, externalEntityId?: string): AdvisacorNormalizedEntity[] {
  const rows = (((report as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)?.Rows as Record<string, unknown> | undefined)?.Row || [];
  return flattenQuickBooksReportRows(Array.isArray(rows) ? rows : []).map((row, index) => quickBooksEntity(sourceReport, row, externalEntityId, index));
}

function firstAvailableReport(reports: Record<string, { ok?: boolean; data?: unknown }>, keys: string[]) {
  const key = keys.find((candidate) => reports[candidate]?.ok && reports[candidate]?.data);
  return key ? { key, report: reports[key] } : null;
}

function normalizeQuickBooksTrialBalance(report: unknown, externalEntityId?: string): CanonicalTrialBalanceRow[] {
  return normalizeQuickBooksReportEntities("TrialBalance", report, externalEntityId)
    .filter((row) => !/^total\b/i.test(row.name))
    .map((row) => {
      const amount = Number(row.amount || row.balance || 0);
      return {
        accountId: row.id,
        accountName: row.name,
        debit: amount >= 0 ? amount : 0,
        credit: amount < 0 ? Math.abs(amount) : 0,
        netAmount: amount,
        source: row.source,
      };
    });
}

function normalizeQuickBooksAccounts(queryResult: unknown, externalEntityId?: string): CanonicalChartOfAccountsItem[] {
  const accounts = (((queryResult as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)?.QueryResponse as Record<string, unknown> | undefined)?.Account;
  return (Array.isArray(accounts) ? accounts : []).map((account: unknown) => {
    const record = account as Record<string, unknown>;
    return {
      id: `quickbooks:${record.Id || record.Name || "account"}`,
      name: String(record.Name || "Unnamed account"),
      accountNumber: String(record.AcctNum || ""),
      accountType: String(record.AccountType || record.AccountSubType || ""),
      accountClass: String(record.Classification || ""),
      status: record.Active === false ? "INACTIVE" : "ACTIVE",
      currency: String((record.CurrencyRef as Record<string, unknown> | undefined)?.value || ""),
      parentId: String((record.ParentRef as Record<string, unknown> | undefined)?.value || ""),
      active: record.Active !== false,
      source: {
        provider: "quickbooks",
        providerFamily: "intuit",
        providerProduct: "quickbooks_online",
        externalEntityId,
        externalRecordId: String(record.Id || ""),
        sourceReport: "Accounts",
        raw: account,
      },
    };
  });
}

function normalizeQuickBooksQueryEntities(sourceReport: string, queryResult: unknown, externalEntityId?: string): AdvisacorNormalizedEntity[] {
  const response = (((queryResult as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)?.QueryResponse as Record<string, unknown> | undefined) || {};
  const rows = Object.values(response).find(Array.isArray) as unknown[] | undefined;
  return (rows || []).map((row, index) => {
    const record = row as Record<string, unknown>;
    return {
      id: `quickbooks:${sourceReport}:${record.Id || index}`,
      name: String(record.Name || record.FullyQualifiedName || record.DisplayName || `${sourceReport} ${index + 1}`),
      type: sourceReport,
      metadata: { source_system: "quickbooks" },
      source: {
        provider: "quickbooks",
        providerFamily: "intuit",
        providerProduct: "quickbooks_online",
        externalEntityId,
        externalRecordId: String(record.Id || ""),
        sourceReport,
        raw: row,
      },
    };
  });
}

export class QuickBooksAccountingProvider implements AccountingProviderAdapter {
  provider = "quickbooks" as const;
  providerFamily = "intuit";
  providerProduct = "quickbooks_online";

  private adapter(userId?: string | null) {
    return new QuickBooksAdapter(userId || null);
  }

  getAuthorizationUrl({ state }: { state: string }) {
    return this.adapter(null).connect({ state }).url;
  }

  async exchangeCodeForTokens({ code }: { code: string }) {
    const response = await this.adapter(null).exchangeAuthorizationCode(code);
    if (!response.ok) throw new Error(response.payload?.error_description || response.payload?.error || "QuickBooks token exchange failed");
    return response.payload;
  }

  async refreshAccessToken({ refreshToken }: { refreshToken: string }) {
    const response = await this.adapter(null).postTokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString());
    if (!response.ok) throw new Error(response.payload?.error_description || response.payload?.error || "QuickBooks token refresh failed");
    return response.payload;
  }

  async getEntities({ connection }: ProviderRequestParams): Promise<ConnectedAccountingEntity[]> {
    const realmId = connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^qbo:/, "") || "";
    return [
      {
        provider: this.provider,
        externalId: realmId,
        canonicalId: `qbo:${realmId}`,
        name: connection.external_entity_name || "QuickBooks Company",
        tenantOrRealmId: realmId,
      },
    ];
  }

  async selectEntity(params: ProviderRequestParams) {
    const [entity] = await this.getEntities(params);
    return entity;
  }

  async getChartOfAccounts(params: ProviderRequestParams) {
    // TODO: Query QuickBooks Account objects for richer downstream account mapping.
    return normalizeAccounts(this.provider, [], params.connection.external_entity_id || undefined);
  }

  async getTrialBalance() {
    // QuickBooks Online does not expose a first-class trial balance in the existing adapter flow.
    return [];
  }

  async getProfitAndLoss(params: ProviderRequestParams) {
    const bundle = await this.getPrimaryFinancialReports(params);
    return bundle.profitAndLoss;
  }

  async getBalanceSheet(params: ProviderRequestParams) {
    const bundle = await this.getPrimaryFinancialReports(params);
    return bundle.balanceSheet;
  }

  async getCashFlow(params: ProviderRequestParams) {
    const bundle = await this.getPrimaryFinancialReports(params);
    return bundle.cashFlow;
  }

  async getPrimaryFinancialReports(params: ProviderRequestParams) {
    const fixture = params.connection.metadata_json?.certification_fixture;
    if (fixture && typeof fixture === "object") {
      return buildCertificationFixtureReportBundle({
        provider: this.provider,
        entity: await this.selectEntity(params),
        dateRange: params.dateRange || { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) },
        fixture,
      });
    }

    const userAdapter = this.adapter(params.connection.user_id);
    const dateRange = params.dateRange || { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) };
    const raw = params.connection.access_token && params.connection.refresh_token
      ? await userAdapter.fetchReportsForAccountingConnection({
          connection: params.connection,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        })
      : await userAdapter.fetchReports({ start_date: dateRange.startDate, end_date: dateRange.endDate });
    const entity = {
      provider: this.provider,
      externalId: raw.realm_id,
      canonicalId: `qbo:${raw.realm_id}`,
      name: raw.company_profile?.company_name || "QuickBooks Company",
      tenantOrRealmId: raw.realm_id,
    };
    const bundle = emptyReportBundle({ provider: this.provider, entity, dateRange });
    const reports = raw.reports || {};
    const queries = raw.queries || {};
    const externalEntityId = entity.externalId;
    const arReport = firstAvailableReport(reports, ["arAgingSummary", "arAgingDetail", "openInvoices", "customerBalanceSummary"]);
    const apReport = firstAvailableReport(reports, ["apAgingSummary", "apAgingDetail", "unpaidBills", "vendorBalanceSummary"]);
    const inventoryReport = firstAvailableReport(reports, ["inventoryValuation", "inventoryValuationDetail"]);

    bundle.chartOfAccounts = normalizeQuickBooksAccounts(queries.accounts, externalEntityId);
    bundle.trialBalance = reports.trialBalance?.ok ? normalizeQuickBooksTrialBalance(reports.trialBalance, externalEntityId) : [];
    bundle.profitAndLoss = normalizeTabularReportRows(this.provider, "ProfitAndLoss", reports.profitAndLoss?.data?.Rows?.Row || [], externalEntityId);
    bundle.profitAndLossYtd = normalizeTabularReportRows(this.provider, "ProfitAndLossYtd", reports.profitAndLossYtd?.data?.Rows?.Row || [], externalEntityId);
    bundle.balanceSheet = normalizeTabularReportRows(this.provider, "BalanceSheet", reports.balanceSheet?.data?.Rows?.Row || [], externalEntityId);
    bundle.cashFlow = normalizeTabularReportRows(this.provider, "CashFlow", reports.cashFlowStatement?.data?.Rows?.Row || [], externalEntityId);
    bundle.normalizedARAging = arReport ? normalizeQuickBooksReportEntities(arReport.key, arReport.report, externalEntityId) : notAvailableSchedule(this.provider, "AR Aging");
    bundle.normalizedAPAging = apReport ? normalizeQuickBooksReportEntities(apReport.key, apReport.report, externalEntityId) : notAvailableSchedule(this.provider, "AP Aging");
    bundle.normalizedBudgets = reports.budgetVsActuals?.ok ? normalizeQuickBooksReportEntities("BudgetVsActual", reports.budgetVsActuals, externalEntityId) : notAvailableSchedule(this.provider, "Budget");
    bundle.normalizedTransactions = inventoryReport ? normalizeQuickBooksReportEntities(inventoryReport.key, inventoryReport.report, externalEntityId) : notAvailableSchedule(this.provider, "Inventory Valuation");
    bundle.normalizedClasses = queries.classes?.ok ? normalizeQuickBooksQueryEntities("Classes", queries.classes, externalEntityId) : notAvailableSchedule(this.provider, "Classes");
    bundle.normalizedDepartments = queries.departments?.ok ? normalizeQuickBooksQueryEntities("Departments", queries.departments, externalEntityId) : notAvailableSchedule(this.provider, "Departments");
    bundle.normalizedLocations = queries.departments?.ok ? normalizeQuickBooksQueryEntities("Locations", queries.departments, externalEntityId) : notAvailableSchedule(this.provider, "Locations");
    bundle.normalizedProjects = queries.projects?.ok ? normalizeQuickBooksQueryEntities("Projects", queries.projects, externalEntityId) : notAvailableSchedule(this.provider, "Projects");
    bundle.missingReports = Object.entries(reports as Record<string, { ok?: boolean }>)
      .filter(([, report]) => !report?.ok)
      .map(([key]) => key);
    const reportAvailability = [
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Accounts receivable aging summary", attemptedEndpoint: "Reports/AccountsReceivableAgingSummary", rows: bundle.normalizedARAging, normalizedKey: "normalizedARAging" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Accounts payable aging summary", attemptedEndpoint: "Reports/AccountsPayableAgingSummary", rows: bundle.normalizedAPAging, normalizedKey: "normalizedAPAging" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Inventory Valuation Summary", attemptedEndpoint: "Reports/InventoryValuationSummary", rows: bundle.normalizedTransactions, normalizedKey: "normalizedTransactions" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Trial Balance", attemptedEndpoint: "Reports/TrialBalance", rows: bundle.trialBalance, normalizedKey: "normalizedTrialBalance" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Budget", attemptedEndpoint: "Reports/BudgetVsActual", rows: bundle.normalizedBudgets, normalizedKey: "normalizedBudgets" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Classes", attemptedEndpoint: "query Class", rows: bundle.normalizedClasses, normalizedKey: "normalizedClasses" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Departments", attemptedEndpoint: "query Department", rows: bundle.normalizedDepartments, normalizedKey: "normalizedDepartments" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Locations", attemptedEndpoint: "query Department", rows: bundle.normalizedLocations, normalizedKey: "normalizedLocations" }),
      availabilityFromRows({ provider: this.provider, companyId: entity.externalId, selectedPeriod: dateRange, reportName: "Projects", attemptedEndpoint: "query Project", rows: bundle.normalizedProjects, normalizedKey: "normalizedProjects" }),
    ];
    bundle.sourceMetadata.raw = raw;
    bundle.sourceMetadata.raw = {
      ...(raw as Record<string, unknown>),
      diagnostics: {
        ...((raw as Record<string, unknown>).diagnostics as Record<string, unknown> | undefined),
        reportAvailability,
      },
    };
    return bundle;
  }

  async disconnect() {
    // TODO: Revoke Intuit refresh token when write-safe disconnect flow is added.
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supports_oauth: true,
      supports_multi_entity: false,
      supports_chart_of_accounts: true,
      supports_trial_balance: false,
      supports_pnl: true,
      supports_balance_sheet: true,
      supports_cash_flow: true,
      supports_webhooks: false,
      supports_writeback: false,
      requires_entity_selection: false,
      supports_incremental_sync: false,
      fallback_notes: ["Trial balance and some advanced operational reports may require report-specific imports."],
    };
  }
}

export const quickBooksAccountingProvider = new QuickBooksAccountingProvider();
