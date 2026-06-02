import { buildCertificationFixtureReportBundle } from "../normalizers/certification-fixtures";
import { buildMappedFinancialSummary, normalizeFinancialStatementRows } from "../normalizers/financial-statements";
import { emptyReportBundle } from "../normalizers/reports";
import type {
  AccountingDateRange,
  AccountingProviderAdapter,
  AdvisacorNormalizedEntity,
  CanonicalBalanceSheetRow,
  CanonicalChartOfAccountsItem,
  CanonicalPnLRow,
  CanonicalSourceMetadata,
  CanonicalTrialBalanceRow,
  ProviderCapabilities,
  ProviderRequestParams,
} from "../types";

export const XERO_SCOPES = [
  "offline_access",
  "accounting.settings.read",
  "accounting.contacts.read",
  "accounting.invoices.read",
  "accounting.banktransactions.read",
  "accounting.reports.trialbalance.read",
  "accounting.reports.balancesheet.read",
  "accounting.reports.profitandloss.read",
  "accounting.reports.aged.read",
].join(" ");

const REQUIRED_XERO_SYNC_SCOPES = [
  "accounting.settings.read",
  "accounting.reports.trialbalance.read",
  "accounting.reports.balancesheet.read",
  "accounting.reports.profitandloss.read",
];

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

type XeroFlattenedReportRow = {
  label: string;
  amount: number;
  section: string;
  title: string;
  cells: unknown[];
  numericValues: number[];
  depth: number;
  rowType: string;
  accountCode?: string;
  accountId?: string;
  debit?: number;
  credit?: number;
  netAmount?: number;
  raw: unknown;
};

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  const raw = String(value ?? "0").trim();
  const isNegative = /^\(.*\)$/.test(raw) || /^-/.test(raw);
  const normalized = raw.replace(/[($,\s)]/g, "").replace(/^-/, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return isNegative ? -amount : amount;
}

function source(sourceReport: string, raw: unknown, externalEntityId?: string, externalRecordId?: string): CanonicalSourceMetadata {
  return {
    provider: "xero",
    providerFamily: "xero",
    providerProduct: "xero_accounting",
    externalEntityId,
    externalRecordId,
    sourceReport,
    raw,
  };
}

function cellValue(cell: unknown) {
  const record = cell as Record<string, unknown>;
  return String(record?.Value ?? record?.value ?? "");
}

function cellAttributes(cell: unknown) {
  const record = cell as Record<string, unknown>;
  return Array.isArray(record?.Attributes) ? record.Attributes as Array<Record<string, unknown>> : [];
}

function attributeValue(cell: unknown, idPattern: RegExp) {
  const match = cellAttributes(cell).find((attribute) => idPattern.test(String(attribute.Id || attribute.id || "")));
  return match ? String(match.Value ?? match.value ?? "") : "";
}

function extractAccountCodeFromLabel(label: string) {
  return label.match(/^(\d{2,})\s+(.+)$/)?.[1] || "";
}

function numericCellValue(cells: unknown[]) {
  const reversed = [...cells].reverse();
  const match = reversed.find((cell) => Number.isFinite(parseAmount(cellValue(cell))) && cellValue(cell) !== "");
  return match ? parseAmount(cellValue(match)) : 0;
}

function countXeroReportRows(rows: unknown[] = []): number {
  return rows.reduce<number>((count, row) => {
    const record = row as Record<string, unknown>;
    return count + 1 + (Array.isArray(record.Rows) ? countXeroReportRows(record.Rows) : 0);
  }, 0);
}

function reportRows(reportOrRows: unknown): unknown[] {
  if (Array.isArray(reportOrRows)) return reportOrRows;
  const record = reportOrRows as Record<string, unknown>;
  if (Array.isArray(record?.Reports)) return (record.Reports[0] as Record<string, unknown> | undefined)?.Rows as unknown[] || [];
  if (Array.isArray(record?.Rows)) return record.Rows;
  return [];
}

function flattenXeroReportRows(report: unknown = [], section = "", depth = 0): XeroFlattenedReportRow[] {
  const rows = reportRows(report);
  return rows.flatMap((row) => {
    const record = row as Record<string, unknown>;
    const cells = Array.isArray(record.Cells) ? record.Cells : [];
    const rowType = String(record.RowType || record.rowType || "");
    const title = String(record.Title || section || "");
    const childRows = Array.isArray(record.Rows) ? flattenXeroReportRows(record.Rows, title, depth + 1) : [];
    const firstCellValue = cellValue(cells[0]);
    const label = firstCellValue || title || rowType;
    const accountCode = attributeValue(cells[0], /accountcode|account_code|code/i) || extractAccountCodeFromLabel(label);
    const accountId = attributeValue(cells[0], /accountid|account_id/i) || accountCode;
    const currentRow =
      label && cells.length
        ? [{
            label,
            amount: numericCellValue(cells),
            section: title,
            title,
            cells,
            numericValues: cells.map((cell) => parseAmount(cellValue(cell))),
            depth,
            rowType,
            accountCode,
            accountId,
            raw: row,
          }]
        : [];
    return [...currentRow, ...childRows];
  });
}

function flattenXeroTrialBalanceRows(rows: unknown[] = []): XeroFlattenedReportRow[] {
  return flattenXeroReportRows(rows).map((row) => {
    const raw = row.raw as Record<string, unknown> | undefined;
    const cells = Array.isArray(raw?.Cells) ? raw.Cells : [];
    const numericCells = cells.slice(1).map((cell) => parseAmount(cellValue(cell)));
    const debit = numericCells[numericCells.length - 2] ?? 0;
    const credit = numericCells[numericCells.length - 1] ?? 0;
    return {
      ...row,
      accountName: row.label,
      debit,
      credit,
      netAmount: debit - credit,
    };
  });
}

function normalizeXeroAccounts(rows: unknown[] = [], externalEntityId?: string): CanonicalChartOfAccountsItem[] {
  return rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      const externalRecordId = String(record.AccountID || record.accountId || record.Id || record.id || record.Code || record.code || "");
      const accountName = String(record.Name || record.name || record.AccountName || record.accountName || "").trim();
      const accountCode = String(record.Code || record.code || record.accountCode || record.account_code || "").trim();
      const status = String(record.Status || record.status || "");
      return {
        id: `xero:${externalRecordId || accountCode || accountName || "account"}`,
        name: accountName || accountCode || "Unnamed account",
        accountNumber: accountCode,
        accountType: String(record.Type || record.type || record.AccountType || record.accountType || ""),
        accountClass: String(record.Class || record.class || record.AccountClass || record.accountClass || ""),
        status,
        currency: String(record.CurrencyCode || record.currencyCode || record.currency || ""),
        parentId: "",
        active: status ? status.toUpperCase() !== "DELETED" && status.toUpperCase() !== "ARCHIVED" : true,
        source: source("ChartOfAccounts", row, externalEntityId, externalRecordId || accountCode || accountName),
      };
    })
    .filter((account) => account.name !== "Unnamed account" || account.accountNumber);
}

function normalizeXeroStatementRows<T extends CanonicalBalanceSheetRow | CanonicalPnLRow>(
  sourceReport: "BalanceSheet" | "ProfitAndLoss",
  rows: XeroFlattenedReportRow[],
  externalEntityId?: string,
): T[] {
  const mappedRows = rows
    .filter((row) => row.label && !/^header$/i.test(row.rowType))
    .map((row) => ({
      label: row.label,
      amount: row.amount,
      section: row.section,
      source: source(sourceReport, row.raw, externalEntityId, row.accountId || row.accountCode || row.label),
    })) as T[];
  const normalizedRows = normalizeFinancialStatementRows(sourceReport === "BalanceSheet" ? "balanceSheet" : "incomeStatement", mappedRows) as T[];
  if (sourceReport !== "ProfitAndLoss") return normalizedRows;
  return withXeroIncomeStatementPreflightSubtotal(normalizedRows as CanonicalPnLRow[]) as T[];
}

function isXeroTotalRow(label: string) {
  return /^total\b/i.test(label) || /gross profit|net (income|profit)/i.test(label);
}

function xeroAmount(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function xeroFindAmount(rows: CanonicalPnLRow[], patterns: RegExp[]) {
  return rows.find((row) => patterns.some((pattern) => pattern.test(String(row.label || ""))))?.amount;
}

function xeroSumSection(rows: CanonicalPnLRow[], section: string) {
  return rows
    .filter((row) => row.section === section && !isXeroTotalRow(String(row.label || "")))
    .reduce((total, row) => total + xeroAmount(row.amount), 0);
}

function xeroIncomeStatementTotals(rows: CanonicalPnLRow[]) {
  const revenue = xeroAmount(xeroFindAmount(rows, [/^total (income|revenue|sales)$/i]) ?? xeroSumSection(rows, "Revenue"));
  const costOfSales = Math.abs(xeroAmount(xeroFindAmount(rows, [/^total (cost of sales|cost of goods sold|cogs)$/i]) ?? xeroSumSection(rows, "Cost of Sales")));
  const operatingExpenses = Math.abs(xeroAmount(xeroFindAmount(rows, [/^total (operating )?expenses$/i]) ?? xeroSumSection(rows, "Expenses")));
  const otherIncome = xeroAmount(xeroFindAmount(rows, [/^total other income$/i]) ?? xeroSumSection(rows, "Other Income"));
  const otherExpenses = Math.abs(xeroAmount(xeroFindAmount(rows, [/^total other expenses$/i]) ?? xeroSumSection(rows, "Other Expenses")));
  const grossProfit = xeroAmount(xeroFindAmount(rows, [/gross profit/i]) ?? revenue - costOfSales);
  const providerNetIncome = xeroAmount(xeroFindAmount(rows, [/net (income|profit)/i]) ?? revenue - costOfSales - operatingExpenses + otherIncome - otherExpenses);
  const calculatedNetIncome = revenue - costOfSales - operatingExpenses + otherIncome - otherExpenses;
  return { revenue, costOfSales, grossProfit, operatingExpenses, otherIncome, otherExpenses, providerNetIncome, calculatedNetIncome };
}

function withXeroIncomeStatementPreflightSubtotal(rows: CanonicalPnLRow[]) {
  if (!rows.length || rows.some((row) => row.label === "Total Cost and Expenses")) return rows;
  const totals = xeroIncomeStatementTotals(rows);
  const combinedExpenses = totals.costOfSales + totals.operatingExpenses + totals.otherExpenses - totals.otherIncome;
  if (!combinedExpenses) return rows;
  return [
    {
      label: "Total Cost and Expenses",
      amount: combinedExpenses,
      section: "Expenses",
      source: {
        ...rows[0].source,
        sourceReport: "ProfitAndLoss",
        raw: {
          diagnostic: "xero_preflight_expense_subtotal",
          formula: "Cost of Sales + Operating Expenses + Other Expenses - Other Income",
          costOfSales: totals.costOfSales,
          operatingExpenses: totals.operatingExpenses,
          otherIncome: totals.otherIncome,
          otherExpenses: totals.otherExpenses,
        },
      },
    },
    ...rows,
  ];
}

function logXeroIncomeStatementSignDiagnostics(rawRows: XeroFlattenedReportRow[], normalizedRows: CanonicalPnLRow[]) {
  const totals = xeroIncomeStatementTotals(normalizedRows);
  const variance = Math.abs(totals.calculatedNetIncome - totals.providerNetIncome);
  logXeroDiagnostics("income_statement_sign_diagnostics", {
    revenue: totals.revenue,
    costOfSales: totals.costOfSales,
    grossProfit: totals.grossProfit,
    operatingExpenses: totals.operatingExpenses,
    otherIncome: totals.otherIncome,
    otherExpenses: totals.otherExpenses,
    providerNetIncome: totals.providerNetIncome,
    calculatedNetIncome: totals.calculatedNetIncome,
    variance,
    formula: "Net Income = Revenue - Cost of Sales - Expenses + Other Income - Other Expenses",
  });
  logXeroDiagnostics("income_statement_row_signs", {
    rows: normalizedRows
      .filter((row) => /revenue|income|sales|cost|goods|cogs|expense|net income|net profit/i.test(`${row.label} ${row.section}`))
      .map((row) => {
        const rawMatch = rawRows.find((rawRow) => rawRow.label === row.label);
        return {
          accountName: row.label,
          accountType: row.section,
          rawAmount: rawMatch?.amount ?? null,
          normalizedAmount: row.amount,
        };
      }),
  });
}

function normalizeXeroTrialRows(rows: XeroFlattenedReportRow[], externalEntityId?: string): CanonicalTrialBalanceRow[] {
  return rows
    .filter((row) => row.label && !/^header$/i.test(row.rowType) && !/^total\b/i.test(row.label))
    .map((row) => ({
      accountId: row.accountId || row.accountCode || row.label,
      accountName: row.label,
      debit: row.debit || 0,
      credit: row.credit || 0,
      netAmount: row.netAmount ?? (row.debit || 0) - (row.credit || 0),
      source: source("TrialBalance", row.raw, externalEntityId, row.accountId || row.accountCode || row.label),
    }));
}

function latestCompletedMonth(): AccountingDateRange {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function normalizeXeroReportPeriod(dateRange?: AccountingDateRange): AccountingDateRange {
  const debugDate = String(process.env.XERO_DEBUG_REPORT_DATE || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(debugDate)) {
    return {
      startDate: `${debugDate.slice(0, 8)}01`,
      endDate: debugDate,
    };
  }
  const fallback = latestCompletedMonth();
  if (!dateRange?.startDate || !dateRange?.endDate) return fallback;
  const today = new Date().toISOString().slice(0, 10);
  if (dateRange.startDate > today || dateRange.endDate > today || dateRange.startDate > dateRange.endDate) return fallback;
  return dateRange;
}

function logXeroDiagnostics(event: string, diagnostics: Record<string, unknown>) {
  console.info("[xero/mapping]", { event, ...diagnostics });
}

function xeroErrorDiagnostics(error: unknown) {
  const record = error as Error & { statusCode?: number; payload?: unknown; path?: string };
  return {
    exceptionType: record?.name || typeof error,
    exceptionMessage: record?.message || String(error),
    stackTrace: record?.stack || "",
    statusCode: record?.statusCode,
    path: record?.path,
    payloadShape: record?.payload && typeof record.payload === "object" ? Object.keys(record.payload as Record<string, unknown>) : [],
  };
}

function logXeroNormalizationError(report: string, error: unknown, extra: Record<string, unknown> = {}) {
  console.error("[xero/normalization:error]", {
    report,
    ...xeroErrorDiagnostics(error),
    ...extra,
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertMappedWhenRawExists(rawCount: number, mappedCount: number, label: string) {
  if (rawCount > 0 && mappedCount === 0) {
    throw new Error(`Xero ${label} data was retrieved but could not be normalized safely.`);
  }
}

function storedConnectionScopes(connection: ProviderRequestParams["connection"]) {
  return Array.isArray(connection.scopes) ? connection.scopes.map(String) : [];
}

function assertXeroScopesAllowSync(connection: ProviderRequestParams["connection"]) {
  const scopes = storedConnectionScopes(connection);
  if (!scopes.length) return;
  const missingScopes = REQUIRED_XERO_SYNC_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length) {
    throw new Error(`Reconnect Xero to grant required accounting read scopes: ${missingScopes.join(", ")}`);
  }
}

function normalizedEntity(
  sourceReport: string,
  row: Record<string, unknown>,
  externalEntityId?: string,
  fallbackId = "item",
): AdvisacorNormalizedEntity {
  const externalRecordId = String(row.ContactID || row.TrackingCategoryID || row.TrackingOptionID || row.BankTransactionID || row.InvoiceID || row.AccountID || row.id || row.name || fallbackId);
  return {
    id: `xero:${sourceReport}:${externalRecordId}`,
    name: String(row.Name || row.name || row.ContactName || row.label || row.Reference || fallbackId),
    type: String(row.ContactStatus || row.Status || row.Type || row.type || sourceReport),
    balance: Number(row.Balances ? (row.Balances as Record<string, unknown>).AccountsReceivable ?? (row.Balances as Record<string, unknown>).AccountsPayable : row.balance) || undefined,
    amount: Number(row.Total || row.AmountDue || row.amount) || undefined,
    metadata: { source_system: "xero" },
    source: source(sourceReport, row, externalEntityId, externalRecordId),
  };
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.XERO_CLIENT_ID || ""}:${process.env.XERO_CLIENT_SECRET || ""}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error_description || payload.error || "Xero token request failed");
  return payload;
}

export class XeroAccountingProvider implements AccountingProviderAdapter {
  provider = "xero" as const;
  providerFamily = "xero";
  providerProduct = "xero_accounting";

  getAuthorizationUrl({ state, redirectUri }: { state: string; redirectUri?: string }) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.XERO_CLIENT_ID || "",
      redirect_uri: redirectUri || process.env.XERO_REDIRECT_URI || "",
      scope: process.env.XERO_SCOPES || XERO_SCOPES,
      state,
      prompt: "consent",
    });
    return `${XERO_AUTH_URL}?${params.toString()}`;
  }

  exchangeCodeForTokens({ code, redirectUri }: { code: string; redirectUri?: string }) {
    return tokenRequest(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri || process.env.XERO_REDIRECT_URI || "" }));
  }

  refreshAccessToken({ refreshToken }: { refreshToken: string }) {
    return tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }));
  }

  async getEntities({ connection }: ProviderRequestParams) {
    const response = await fetch(XERO_CONNECTIONS_URL, {
      headers: { Authorization: `Bearer ${connection.access_token}` },
    });
    const tenants = await response.json().catch(() => []);
    if (!response.ok) throw new Error(tenants?.detail || "Unable to load Xero tenants");
    return (Array.isArray(tenants) ? tenants : []).map((tenant) => {
      const record = tenant as Record<string, unknown>;
      return {
        provider: this.provider,
        externalId: String(record.tenantId || ""),
        canonicalId: `xero:${record.tenantId || ""}`,
        name: String(record.tenantName || record.organisationName || "Xero Organization"),
        tenantOrRealmId: String(record.tenantId || ""),
        metadata: tenant,
      };
    });
  }

  async selectEntity(params: ProviderRequestParams) {
    const entities = await this.getEntities(params);
    if (params.entityId) {
      const selectedEntity = entities.find((entity) => entity.canonicalId === params.entityId || entity.externalId === params.entityId);
      if (!selectedEntity) throw new Error("Selected Xero organization was not found for this connection.");
      return selectedEntity;
    }
    if (params.connection.tenant_or_realm_id || params.connection.external_entity_id) {
      const selectedTenantId = params.connection.tenant_or_realm_id || params.connection.external_entity_id?.replace(/^xero:/, "") || "";
      const selectedEntity = entities.find((entity) => entity.tenantOrRealmId === selectedTenantId || entity.externalId === selectedTenantId || entity.canonicalId === params.connection.external_entity_id);
      if (selectedEntity) return selectedEntity;
    }
    if (!entities[0]) throw new Error("No Xero organizations were returned for this connection.");
    return entities[0];
  }

  selectedEntityFromConnection(connection: ProviderRequestParams["connection"]) {
    const tenantId = connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^xero:/, "") || "";
    if (!tenantId) throw new Error("Select a Xero organization before syncing financial reports.");
    return {
      provider: this.provider,
      externalId: tenantId,
      canonicalId: connection.external_entity_id || `xero:${tenantId}`,
      name: connection.external_entity_name || "Xero Organization",
      tenantOrRealmId: tenantId,
    };
  }

  async xeroGet(connection: ProviderRequestParams["connection"], path: string) {
    const tenantId = connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^xero:/, "") || "";
    if (!tenantId) throw new Error("Select a Xero organization before syncing financial reports.");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "xero-tenant-id": tenantId,
          Accept: "application/json",
        },
      });
      const payload = await response.json().catch(() => ({}));
      logXeroDiagnostics("api_call", {
        tenantId,
        path: path.split("?")[0],
        statusCode: response.status,
        attempt: attempt + 1,
      });
      if (response.ok) return payload;
      if (response.status === 429 && attempt < 2) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
        await delay(retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 1500 * (attempt + 1));
        continue;
      }
      const error = new Error(payload?.Message || payload?.Detail || `Xero request failed: ${path}`) as Error & {
        statusCode?: number;
        payload?: unknown;
        path?: string;
      };
      error.statusCode = response.status;
      error.payload = payload;
      error.path = path;
      throw error;
    }
    throw new Error(`Xero request failed: ${path}`);
  }

  async getChartOfAccounts(params: ProviderRequestParams) {
    const payload = await this.xeroGet(params.connection, "Accounts");
    const accounts = Array.isArray(payload.Accounts) ? payload.Accounts : Array.isArray(payload.accounts) ? payload.accounts : [];
    const mappedAccounts = normalizeXeroAccounts(accounts, params.connection.external_entity_id || undefined);
    logXeroDiagnostics("accounts_pulled", {
      tenantId: params.connection.tenant_or_realm_id || params.connection.external_entity_id,
      xeroRawAccountsCount: accounts.length,
      xeroMappedAccountsCount: mappedAccounts.length,
    });
    assertMappedWhenRawExists(accounts.length, mappedAccounts.length, "Accounts");
    return mappedAccounts;
  }

  async getTrialBalance(params: ProviderRequestParams) {
    return this.getXeroTrialBalance(params);
  }

  async getProfitAndLoss(params: ProviderRequestParams) {
    const reportPeriod = normalizeXeroReportPeriod(params.dateRange);
    const payload = await this.xeroGet(params.connection, `Reports/ProfitAndLoss?fromDate=${reportPeriod.startDate}&toDate=${reportPeriod.endDate}`);
    const rawRowCount = countXeroReportRows(payload.Reports?.[0]?.Rows || []);
    const rows = flattenXeroReportRows(payload.Reports?.[0]?.Rows || []);
    const mappedRows = normalizeXeroStatementRows<CanonicalPnLRow>("ProfitAndLoss", rows, params.connection.external_entity_id || undefined);
    logXeroIncomeStatementSignDiagnostics(rows, mappedRows);
    logXeroDiagnostics("profit_and_loss_pulled", {
      tenantId: params.connection.tenant_or_realm_id || params.connection.external_entity_id,
      reportPeriod,
      xeroRawProfitAndLossRowsCount: rawRowCount,
      xeroRawProfitAndLossFlattenedRowsCount: rows.length,
      xeroMappedIncomeStatementRowsCount: mappedRows.length,
    });
    assertMappedWhenRawExists(rawRowCount, mappedRows.length, "Profit and Loss");
    return mappedRows;
  }

  async getBalanceSheet(params: ProviderRequestParams) {
    const reportPeriod = normalizeXeroReportPeriod(params.dateRange);
    const payload = await this.xeroGet(params.connection, `Reports/BalanceSheet?date=${reportPeriod.endDate}`);
    const rawRowCount = countXeroReportRows(payload.Reports?.[0]?.Rows || []);
    const rows = flattenXeroReportRows(payload.Reports?.[0]?.Rows || []);
    const mappedRows = normalizeXeroStatementRows<CanonicalBalanceSheetRow>("BalanceSheet", rows, params.connection.external_entity_id || undefined);
    logXeroDiagnostics("balance_sheet_pulled", {
      tenantId: params.connection.tenant_or_realm_id || params.connection.external_entity_id,
      reportPeriod,
      xeroRawBalanceSheetRowsCount: rawRowCount,
      xeroRawBalanceSheetFlattenedRowsCount: rows.length,
      xeroMappedBalanceSheetRowsCount: mappedRows.length,
    });
    assertMappedWhenRawExists(rawRowCount, mappedRows.length, "Balance Sheet");
    return mappedRows;
  }

  async getCashFlow() {
    return [];
  }

  async getXeroTrialBalance(params: ProviderRequestParams) {
    const reportPeriod = normalizeXeroReportPeriod(params.dateRange);
    const payload = await this.xeroGet(params.connection, `Reports/TrialBalance?date=${reportPeriod.endDate}`);
    const rawRowCount = countXeroReportRows(payload.Reports?.[0]?.Rows || []);
    const rows = flattenXeroTrialBalanceRows(payload.Reports?.[0]?.Rows || []);
    const normalizedRows = normalizeXeroTrialRows(rows, params.connection.external_entity_id || undefined);
    logXeroDiagnostics("trial_balance_pulled", {
      tenantId: params.connection.tenant_or_realm_id || params.connection.external_entity_id,
      reportPeriod,
      xeroRawTrialBalanceRowsCount: rawRowCount,
      xeroRawTrialBalanceFlattenedRowsCount: rows.length,
      xeroMappedTrialBalanceRowsCount: normalizedRows.length,
    });
    assertMappedWhenRawExists(rawRowCount, normalizedRows.length, "Trial Balance");
    return normalizedRows;
  }

  async getAgingReport(params: ProviderRequestParams, report: "AgedReceivablesByContact" | "AgedPayablesByContact") {
    const reportPeriod = normalizeXeroReportPeriod(params.dateRange);
    const payload = await this.xeroGet(params.connection, `Reports/${report}?date=${reportPeriod.endDate}`);
    const rows = flattenXeroReportRows(payload.Reports?.[0]?.Rows || []);
    logXeroDiagnostics("aging_pulled", {
      tenantId: params.connection.tenant_or_realm_id || params.connection.external_entity_id,
      reportPeriod,
      report,
      rowsCount: rows.length,
    });
    return rows.map((row, index) =>
      normalizedEntity(report, row, params.connection.external_entity_id || undefined, `${report}:${index}`),
    );
  }

  async getBudgetSummary(params: ProviderRequestParams) {
    const reportPeriod = normalizeXeroReportPeriod(params.dateRange);
    const payload = await this.xeroGet(params.connection, `Reports/BudgetSummary?fromDate=${reportPeriod.startDate}&toDate=${reportPeriod.endDate}`);
    return flattenXeroReportRows(payload.Reports?.[0]?.Rows || []).map((row, index) =>
      normalizedEntity("BudgetSummary", row, params.connection.external_entity_id || undefined, `budget:${index}`),
    );
  }

  async getTrackingDimensions(params: ProviderRequestParams) {
    const payload = await this.xeroGet(params.connection, "TrackingCategories");
    const categories: unknown[] = Array.isArray(payload.TrackingCategories) ? payload.TrackingCategories : [];
    const entities: AdvisacorNormalizedEntity[] = categories.flatMap((category: unknown) => {
      const record = category as Record<string, unknown>;
      const options: unknown[] = Array.isArray(record.Options) ? record.Options : [];
      return [
        normalizedEntity("TrackingCategory", record, params.connection.external_entity_id || undefined, "tracking-category"),
        ...options.map((option: unknown, index: number) => normalizedEntity("TrackingOption", option as Record<string, unknown>, params.connection.external_entity_id || undefined, `tracking-option:${index}`)),
      ];
    });
    return {
      departments: entities.filter((entity: AdvisacorNormalizedEntity) => /department/i.test(`${entity.name} ${entity.type}`)),
      locations: entities.filter((entity: AdvisacorNormalizedEntity) => /location|region|site/i.test(`${entity.name} ${entity.type}`)),
      classes: entities,
      projects: entities.filter((entity: AdvisacorNormalizedEntity) => /project|job/i.test(`${entity.name} ${entity.type}`)),
    };
  }

  async getContacts(params: ProviderRequestParams) {
    const payload = await this.xeroGet(params.connection, "Contacts");
    const contacts: unknown[] = Array.isArray(payload.Contacts) ? payload.Contacts : [];
    logXeroDiagnostics("contacts_pulled", {
      tenantId: params.connection.tenant_or_realm_id || params.connection.external_entity_id,
      contactsCount: contacts.length,
    });
    return {
      vendors: contacts
        .filter((contact: unknown) => {
          const record = contact as Record<string, unknown>;
          return Boolean(record.IsSupplier) || /supplier|vendor/i.test(`${record.ContactStatus || ""} ${record.Name || ""}`);
        })
        .map((contact: unknown, index: number) => normalizedEntity("Contact", contact as Record<string, unknown>, params.connection.external_entity_id || undefined, `vendor:${index}`)),
      customers: contacts
        .filter((contact: unknown) => {
          const record = contact as Record<string, unknown>;
          return Boolean(record.IsCustomer) || /customer/i.test(`${record.ContactStatus || ""} ${record.Name || ""}`);
        })
        .map((contact: unknown, index: number) => normalizedEntity("Contact", contact as Record<string, unknown>, params.connection.external_entity_id || undefined, `customer:${index}`)),
    };
  }

  async getTransactions(params: ProviderRequestParams) {
    const payload = await this.xeroGet(params.connection, "BankTransactions");
    const transactions: unknown[] = Array.isArray(payload.BankTransactions) ? payload.BankTransactions : [];
    logXeroDiagnostics("bank_transactions_pulled", {
      tenantId: params.connection.tenant_or_realm_id || params.connection.external_entity_id,
      transactionsCount: transactions.length,
    });
    return transactions.map((transaction: unknown, index: number) =>
      normalizedEntity("BankTransaction", transaction as Record<string, unknown>, params.connection.external_entity_id || undefined, `transaction:${index}`),
    );
  }

  async getPrimaryFinancialReports(params: ProviderRequestParams) {
    const fixture = params.connection.metadata_json?.certification_fixture;
    if (fixture && typeof fixture === "object") {
      const tenantId = params.connection.tenant_or_realm_id || params.connection.external_entity_id?.replace(/^xero:/, "") || "";
      return buildCertificationFixtureReportBundle({
        provider: this.provider,
        entity: {
          provider: this.provider,
          externalId: tenantId,
          canonicalId: params.connection.external_entity_id || `xero:${tenantId || "certification-company"}`,
          name: params.connection.external_entity_name || "Xero Organization",
          tenantOrRealmId: tenantId,
        },
        dateRange: params.dateRange || { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) },
        fixture,
      });
    }

    const entity = this.selectedEntityFromConnection(params.connection);
    assertXeroScopesAllowSync(params.connection);
    const reportPeriod = normalizeXeroReportPeriod(params.dateRange);
    logXeroDiagnostics("report_period_selected", {
      tenantId: entity.tenantOrRealmId,
      reportPeriod,
    });
    const bundle = emptyReportBundle({ provider: this.provider, entity, dateRange: reportPeriod, missingReports: ["cash_flow"] });
    const normalizationErrors: Array<Record<string, unknown>> = [];
    const fetchCoreReport = async (report: string, path: string) => {
      try {
        return await this.xeroGet(params.connection, path);
      } catch (error) {
        const diagnostics = xeroErrorDiagnostics(error);
        normalizationErrors.push({ report, phase: "fetch", ...diagnostics });
        logXeroNormalizationError(report, error, { phase: "fetch", url: `https://api.xero.com/api.xro/2.0/${path}` });
        return null;
      }
    };
    const accountsPayload = await fetchCoreReport("Accounts", "Accounts");
    const trialBalancePayload = await fetchCoreReport("Trial Balance", `Reports/TrialBalance?date=${reportPeriod.endDate}`);
    const profitAndLossPayload = await fetchCoreReport("Profit and Loss", `Reports/ProfitAndLoss?fromDate=${reportPeriod.startDate}&toDate=${reportPeriod.endDate}`);
    const balanceSheetPayload = await fetchCoreReport("Balance Sheet", `Reports/BalanceSheet?date=${reportPeriod.endDate}`);
    const [arAging, apAging, budgets, trackingDimensions, contacts, transactions] = await Promise.all([
      this.getAgingReport({ ...params, dateRange: reportPeriod }, "AgedReceivablesByContact").catch(() => []),
      this.getAgingReport({ ...params, dateRange: reportPeriod }, "AgedPayablesByContact").catch(() => []),
      this.getBudgetSummary({ ...params, dateRange: reportPeriod }).catch(() => []),
      this.getTrackingDimensions({ ...params, dateRange: reportPeriod }).catch(() => ({ departments: [], locations: [], classes: [], projects: [] })),
      this.getContacts({ ...params, dateRange: reportPeriod }).catch(() => ({ vendors: [], customers: [] })),
      this.getTransactions({ ...params, dateRange: reportPeriod }).catch(() => []),
    ]);
    const rawAccounts = Array.isArray(accountsPayload?.Accounts) ? accountsPayload.Accounts : Array.isArray(accountsPayload?.accounts) ? accountsPayload.accounts : [];
    const rawTrialBalanceRows = trialBalancePayload?.Reports?.[0]?.Rows || [];
    const rawProfitAndLossRows = profitAndLossPayload?.Reports?.[0]?.Rows || [];
    const rawBalanceSheetRows = balanceSheetPayload?.Reports?.[0]?.Rows || [];
    let flattenedTrialBalanceRows: XeroFlattenedReportRow[] = [];
    let flattenedProfitAndLossRows: XeroFlattenedReportRow[] = [];
    let flattenedBalanceSheetRows: XeroFlattenedReportRow[] = [];
    let chartOfAccounts: CanonicalChartOfAccountsItem[] = [];
    let trialBalance: CanonicalTrialBalanceRow[] = [];
    let profitAndLoss: CanonicalPnLRow[] = [];
    let balanceSheet: CanonicalBalanceSheetRow[] = [];
    try {
      chartOfAccounts = normalizeXeroAccounts(rawAccounts, params.connection.external_entity_id || undefined);
    } catch (error) {
      const diagnostics = xeroErrorDiagnostics(error);
      normalizationErrors.push({ report: "Accounts", phase: "normalize", ...diagnostics });
      logXeroNormalizationError("Accounts", error, { phase: "normalize", rawCount: rawAccounts.length });
    }
    try {
      flattenedTrialBalanceRows = flattenXeroTrialBalanceRows(rawTrialBalanceRows);
      trialBalance = normalizeXeroTrialRows(flattenedTrialBalanceRows, params.connection.external_entity_id || undefined);
    } catch (error) {
      const diagnostics = xeroErrorDiagnostics(error);
      normalizationErrors.push({ report: "Trial Balance", phase: "normalize", ...diagnostics });
      logXeroNormalizationError("Trial Balance", error, { phase: "normalize", rawCount: countXeroReportRows(rawTrialBalanceRows) });
    }
    try {
      flattenedProfitAndLossRows = flattenXeroReportRows(rawProfitAndLossRows);
      profitAndLoss = normalizeXeroStatementRows<CanonicalPnLRow>("ProfitAndLoss", flattenedProfitAndLossRows, params.connection.external_entity_id || undefined);
      logXeroIncomeStatementSignDiagnostics(flattenedProfitAndLossRows, profitAndLoss);
    } catch (error) {
      const diagnostics = xeroErrorDiagnostics(error);
      normalizationErrors.push({ report: "Profit and Loss", phase: "normalize", ...diagnostics });
      logXeroNormalizationError("Profit and Loss", error, { phase: "normalize", rawCount: countXeroReportRows(rawProfitAndLossRows) });
    }
    try {
      flattenedBalanceSheetRows = flattenXeroReportRows(rawBalanceSheetRows);
      balanceSheet = normalizeXeroStatementRows<CanonicalBalanceSheetRow>("BalanceSheet", flattenedBalanceSheetRows, params.connection.external_entity_id || undefined);
    } catch (error) {
      const diagnostics = xeroErrorDiagnostics(error);
      normalizationErrors.push({ report: "Balance Sheet", phase: "normalize", ...diagnostics });
      logXeroNormalizationError("Balance Sheet", error, {
        phase: "normalize",
        rawCount: countXeroReportRows(rawBalanceSheetRows),
        firstRows: rawBalanceSheetRows.slice(0, 3),
      });
    }
    const reportMappingDiagnostics = {
      accounts: {
        rawCount: rawAccounts.length,
        mappedCount: chartOfAccounts.length,
        error: normalizationErrors.find((item) => item.report === "Accounts")?.exceptionMessage || null,
      },
      trialBalance: {
        rawCount: countXeroReportRows(rawTrialBalanceRows),
        mappedCount: trialBalance.length,
        error: normalizationErrors.find((item) => item.report === "Trial Balance")?.exceptionMessage || null,
      },
      balanceSheet: {
        rawCount: countXeroReportRows(rawBalanceSheetRows),
        mappedCount: balanceSheet.length,
        error: normalizationErrors.find((item) => item.report === "Balance Sheet")?.exceptionMessage || null,
      },
      incomeStatement: {
        rawCount: countXeroReportRows(rawProfitAndLossRows),
        mappedCount: profitAndLoss.length,
        error: normalizationErrors.find((item) => item.report === "Profit and Loss")?.exceptionMessage || null,
      },
    };
    const mappedFinancialSummary = buildMappedFinancialSummary(balanceSheet, profitAndLoss);
    const xeroFetchDiagnostics = {
      xeroRawAccountsCount: rawAccounts.length,
      xeroMappedAccountsCount: chartOfAccounts.length,
      xeroRawTrialBalanceRowsCount: countXeroReportRows(rawTrialBalanceRows),
      xeroRawTrialBalanceFlattenedRowsCount: flattenedTrialBalanceRows.length,
      xeroMappedTrialBalanceRowsCount: trialBalance.length,
      xeroRawBalanceSheetRowsCount: countXeroReportRows(rawBalanceSheetRows),
      xeroRawBalanceSheetFlattenedRowsCount: flattenedBalanceSheetRows.length,
      xeroMappedBalanceSheetRowsCount: balanceSheet.length,
      xeroRawProfitAndLossRowsCount: countXeroReportRows(rawProfitAndLossRows),
      xeroRawProfitAndLossFlattenedRowsCount: flattenedProfitAndLossRows.length,
      xeroMappedIncomeStatementRowsCount: profitAndLoss.length,
      xeroNormalizationErrors: normalizationErrors,
      xeroReportMappingDiagnostics: reportMappingDiagnostics,
      mappedFinancialSummary,
    };
    logXeroDiagnostics("accounts_pulled", {
      tenantId: entity.tenantOrRealmId,
      xeroRawAccountsCount: xeroFetchDiagnostics.xeroRawAccountsCount,
      xeroMappedAccountsCount: xeroFetchDiagnostics.xeroMappedAccountsCount,
    });
    logXeroDiagnostics("trial_balance_pulled", {
      tenantId: entity.tenantOrRealmId,
      reportPeriod,
      xeroRawTrialBalanceRowsCount: xeroFetchDiagnostics.xeroRawTrialBalanceRowsCount,
      xeroRawTrialBalanceFlattenedRowsCount: xeroFetchDiagnostics.xeroRawTrialBalanceFlattenedRowsCount,
      xeroMappedTrialBalanceRowsCount: xeroFetchDiagnostics.xeroMappedTrialBalanceRowsCount,
    });
    logXeroDiagnostics("profit_and_loss_pulled", {
      tenantId: entity.tenantOrRealmId,
      reportPeriod,
      xeroRawProfitAndLossRowsCount: xeroFetchDiagnostics.xeroRawProfitAndLossRowsCount,
      xeroRawProfitAndLossFlattenedRowsCount: xeroFetchDiagnostics.xeroRawProfitAndLossFlattenedRowsCount,
      xeroMappedIncomeStatementRowsCount: xeroFetchDiagnostics.xeroMappedIncomeStatementRowsCount,
    });
    logXeroDiagnostics("balance_sheet_pulled", {
      tenantId: entity.tenantOrRealmId,
      reportPeriod,
      xeroRawBalanceSheetRowsCount: xeroFetchDiagnostics.xeroRawBalanceSheetRowsCount,
      xeroRawBalanceSheetFlattenedRowsCount: xeroFetchDiagnostics.xeroRawBalanceSheetFlattenedRowsCount,
      xeroMappedBalanceSheetRowsCount: xeroFetchDiagnostics.xeroMappedBalanceSheetRowsCount,
    });
    logXeroDiagnostics("mapped_financial_summary", mappedFinancialSummary);
    bundle.chartOfAccounts = chartOfAccounts;
    bundle.trialBalance = trialBalance;
    bundle.profitAndLoss = profitAndLoss;
    bundle.balanceSheet = balanceSheet;
    bundle.normalizedTransactions = transactions;
    bundle.normalizedARAging = arAging;
    bundle.normalizedAPAging = apAging;
    bundle.normalizedBudgets = budgets;
    bundle.normalizedDepartments = trackingDimensions.departments;
    bundle.normalizedLocations = trackingDimensions.locations;
    bundle.normalizedClasses = trackingDimensions.classes;
    bundle.normalizedProjects = trackingDimensions.projects;
    bundle.normalizedVendors = contacts.vendors;
    bundle.normalizedCustomers = contacts.customers;
    bundle.sourceMetadata.raw = {
      diagnostics: {
        tenantId: entity.tenantOrRealmId,
        reportPeriod,
        ...xeroFetchDiagnostics,
        arAgingRowsCount: arAging.length,
        apAgingRowsCount: apAging.length,
      },
    };
    logXeroDiagnostics("raw_reports_mapped", (bundle.sourceMetadata.raw as Record<string, unknown>).diagnostics as Record<string, unknown>);
    return bundle;
  }

  async disconnect() {}

  getCapabilities(): ProviderCapabilities {
    return {
      supports_oauth: true,
      supports_multi_entity: true,
      supports_chart_of_accounts: true,
      supports_trial_balance: true,
      supports_pnl: true,
      supports_balance_sheet: true,
      supports_cash_flow: false,
      supports_webhooks: true,
      supports_writeback: false,
      requires_entity_selection: true,
      supports_incremental_sync: false,
      fallback_notes: ["Cash flow may require file import/manual upload depending on Xero plan and region."],
    };
  }
}

export const xeroAccountingProvider = new XeroAccountingProvider();
