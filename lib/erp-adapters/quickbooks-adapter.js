import QuickBooks from "node-quickbooks";
import { ERPBaseAdapter } from "./base-adapter";
import { supabaseAdmin } from "../supabase";
import { recommendPackage } from "../package-recommender";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const QUICKBOOKS_SCOPE = "com.intuit.quickbooks.accounting";
const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const PLATFORM = "quickbooks";
const PRIMARY_CONNECTION_TABLE = "erp_connections";
const LEGACY_CONNECTION_TABLE = "quickbooks_connections";

const reportChecks = [
  ["ProfitAndLoss", "ProfitAndLoss"],
  ["BalanceSheet", "BalanceSheet"],
  ["GeneralLedger", "GeneralLedger"],
  ["ARAging", "AgedReceivables"],
  ["APAging", "AgedPayables"],
  ["Inventory", "InventoryValuationSummary"],
  ["SalesByCustomer", "CustomerSales"],
  ["ExpensesByVendor", "VendorExpenses"],
  ["PayrollSummary", "PayrollSummary"],
  ["BudgetVsActual", "BudgetVsActual"],
];

export const ERP_CONNECTIONS_SQL = `
-- Run this in the Supabase SQL editor before using multi-platform ERP connections.
alter table public.quickbooks_connections rename to erp_connections;
alter table public.erp_connections add column platform text default 'quickbooks';
create index if not exists erp_connections_user_platform_idx on public.erp_connections(user_id, platform);
`;

function getTokenExpiry(token) {
  const expiresInSeconds = Number(token?.expires_in || 3600);
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

function isExpiredOrExpiring(tokenExpiry) {
  if (!tokenExpiry) return true;
  return new Date(tokenExpiry).getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

function isMissingTableError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;
  return error?.code === "PGRST205" || message.includes("Could not find the table");
}

function withConnectionTable(connection, tableName) {
  return connection ? { ...connection, __table: tableName } : null;
}

function runReport(qbo, methodName, options) {
  return new Promise((resolve, reject) => {
    qbo[methodName](options, (error, report) => {
      if (error) reject(error);
      else resolve(report);
    });
  });
}

function inferQuickBooksVersion(capabilities) {
  if (capabilities.has_payroll && capabilities.has_inventory && capabilities.has_classes && capabilities.has_budgets) {
    return "Advanced";
  }
  if (capabilities.has_inventory || capabilities.has_classes || capabilities.has_budgets) return "Plus";
  if (capabilities.available_reports.includes("ARAging") || capabilities.available_reports.includes("APAging")) return "Essentials";
  return "Simple Start";
}

export class QuickBooksAdapter extends ERPBaseAdapter {
  constructor(userId) {
    super({ platform: PLATFORM, userId });
  }

  getEnvironment() {
    return process.env.QB_ENVIRONMENT === "production" ? "production" : "sandbox";
  }

  getBaseUrl() {
    return this.getEnvironment() === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";
  }

  getConfig() {
    const config = {
      clientId: process.env.QB_CLIENT_ID?.trim(),
      clientSecret: process.env.QB_CLIENT_SECRET?.trim(),
      environment: process.env.QB_ENVIRONMENT?.trim(),
      redirectUri: process.env.QB_REDIRECT_URI?.trim(),
    };
    const missing = Object.entries(config)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length) {
      throw new Error(`Missing QuickBooks OAuth config: ${missing.join(", ")}`);
    }

    if (!["sandbox", "production"].includes(config.environment)) {
      throw new Error(`Invalid QuickBooks OAuth environment: ${config.environment}`);
    }

    return config;
  }

  connect({ state }) {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: QUICKBOOKS_SCOPE,
      state,
    });
    const url = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;

    if (new URL(url).searchParams.get("client_id") !== config.clientId) {
      throw new Error("Generated QuickBooks authorization URL is missing the configured client_id");
    }

    return { url, config };
  }

  getBasicAuthHeader() {
    const config = this.getConfig();
    return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
  }

  async postTokenRequest(body) {
    const response = await fetch(QUICKBOOKS_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: this.getBasicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    const responseText = await response.text();
    let payload = null;

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { raw: responseText };
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      payload,
      raw: responseText,
    };
  }

  async exchangeAuthorizationCode(code) {
    const config = this.getConfig();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    });

    return this.postTokenRequest(body.toString());
  }

  async refreshToken(connection) {
    const tokenResponse = await this.postTokenRequest(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token,
      }).toString(),
    );

    if (!tokenResponse.ok) {
      throw new Error(tokenResponse.payload?.error_description || tokenResponse.payload?.error || "QuickBooks token refresh failed");
    }

    const token = tokenResponse.payload;
    const accessToken = token.access_token;
    const refreshToken = token.refresh_token || connection.refresh_token;

    if (!accessToken) {
      throw new Error("QuickBooks refresh did not return an access token");
    }

    const tableName = connection.__table || PRIMARY_CONNECTION_TABLE;
    const isPrimaryTable = tableName === PRIMARY_CONNECTION_TABLE;
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: getTokenExpiry(token),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id)
      .select(
        isPrimaryTable
          ? "id, user_id, platform, realm_id, access_token, refresh_token, token_expiry"
          : "id, user_id, realm_id, access_token, refresh_token, token_expiry",
      )
      .single();

    if (error) throw error;
    return withConnectionTable(isPrimaryTable ? data : { ...data, platform: PLATFORM }, tableName);
  }

  async saveConnection({ realmId, token }) {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client is not configured");
    }

    const accessToken = token?.access_token;
    const refreshToken = token?.refresh_token;

    if (!this.userId || !realmId || !accessToken || !refreshToken) {
      throw new Error("QuickBooks connection is missing required token fields");
    }

    const basePayload = {
      user_id: this.userId,
      realm_id: realmId,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: getTokenExpiry(token),
      updated_at: new Date().toISOString(),
    };

    const saveToTable = async (tableName) => {
      const isPrimaryTable = tableName === PRIMARY_CONNECTION_TABLE;
      const payload = isPrimaryTable ? { ...basePayload, platform: PLATFORM } : basePayload;
      let lookupQuery = supabaseAdmin
        .from(tableName)
        .select("id")
        .eq("user_id", this.userId)
        .eq("realm_id", realmId);

      if (isPrimaryTable) lookupQuery = lookupQuery.eq("platform", PLATFORM);

      const { data: existingConnection, error: lookupError } = await lookupQuery.maybeSingle();
      if (lookupError) throw lookupError;

      const selectColumns = isPrimaryTable
        ? "id, user_id, platform, realm_id, token_expiry, updated_at"
        : "id, user_id, realm_id, token_expiry, updated_at";

      const result = existingConnection?.id
        ? await supabaseAdmin
            .from(tableName)
            .update(payload)
            .eq("id", existingConnection.id)
            .select(selectColumns)
            .single()
        : await supabaseAdmin
            .from(tableName)
            .insert(payload)
            .select(selectColumns)
            .single();

      if (result.error) throw result.error;
      return withConnectionTable(
        isPrimaryTable ? result.data : { ...result.data, platform: PLATFORM },
        tableName,
      );
    };

    try {
      return await saveToTable(PRIMARY_CONNECTION_TABLE);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      console.warn("[quickbooks-adapter] erp_connections table not found; falling back to quickbooks_connections");
      return saveToTable(LEGACY_CONNECTION_TABLE);
    }
  }

  async getConnection() {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client is not configured");
    }

    const getFromTable = async (tableName) => {
      const isPrimaryTable = tableName === PRIMARY_CONNECTION_TABLE;
      let query = supabaseAdmin
        .from(tableName)
        .select(
          isPrimaryTable
            ? "id, user_id, platform, realm_id, access_token, refresh_token, token_expiry"
            : "id, user_id, realm_id, access_token, refresh_token, token_expiry",
        )
        .eq("user_id", this.userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (isPrimaryTable) query = query.eq("platform", PLATFORM);

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return withConnectionTable(isPrimaryTable || !data ? data : { ...data, platform: PLATFORM }, tableName);
    };

    try {
      return await getFromTable(PRIMARY_CONNECTION_TABLE);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      console.warn("[quickbooks-adapter] erp_connections table not found; reading quickbooks_connections");
      return getFromTable(LEGACY_CONNECTION_TABLE);
    }
  }

  async hasConnection() {
    return Boolean(await this.getConnection());
  }

  async getAuthenticatedClient() {
    let connection = await this.getConnection();

    if (!connection) {
      throw new Error("QuickBooks is not connected for this user");
    }

    if (isExpiredOrExpiring(connection.token_expiry)) {
      connection = await this.refreshToken(connection);
    }

    const useSandbox = this.getEnvironment() === "sandbox";
    const qbo = new QuickBooks(
      process.env.QB_CLIENT_ID,
      process.env.QB_CLIENT_SECRET,
      connection.access_token,
      false,
      connection.realm_id,
      useSandbox,
      false,
      null,
      "2.0",
      connection.refresh_token,
    );

    return {
      qbo,
      accessToken: connection.access_token,
      realmId: connection.realm_id,
    };
  }

  async makeApiCall(accessToken, url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const responseText = await response.text();
    let payload = null;

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(payload?.Fault?.Error?.[0]?.Message || payload?.error || `QuickBooks API request failed (${response.status})`);
    }

    return payload;
  }

  async runBudgetVsActualReport(accessToken, realmId, options) {
    const params = new URLSearchParams(options);
    return this.makeApiCall(accessToken, `${this.getBaseUrl()}/v3/company/${realmId}/reports/BudgetVsActual?${params.toString()}`);
  }

  async getCompanyProfile(accessToken, realmId) {
    const companyInfoUrl = `${this.getBaseUrl()}/v3/company/${realmId}/companyinfo/${realmId}`;
    const companyInfo = await this.makeApiCall(accessToken, companyInfoUrl);
    const profile = companyInfo?.CompanyInfo || {};

    return {
      company_name: profile.CompanyName || profile.LegalName || "",
      legal_name: profile.LegalName || "",
      email: profile.Email?.Address || profile.PrimaryEmailAddr?.Address || "",
      country: profile.Country || "",
    };
  }

  async fetchReports({ start_date: startDate, end_date: endDate }) {
    const { qbo, accessToken, realmId } = await this.getAuthenticatedClient();
    const reportOptions = {
      start_date: startDate,
      end_date: endDate,
    };
    const asOfReportOptions = {
      report_date: endDate,
    };
    const reportRequests = {
      profitAndLoss: () => runReport(qbo, "reportProfitAndLoss", reportOptions),
      balanceSheet: () => runReport(qbo, "reportBalanceSheet", asOfReportOptions),
      cashFlowStatement: () => runReport(qbo, "reportCashFlow", reportOptions),
      generalLedger: () => runReport(qbo, "reportGeneralLedgerDetail", reportOptions),
      arAgingSummary: () => runReport(qbo, "reportAgedReceivables", asOfReportOptions),
      apAgingSummary: () => runReport(qbo, "reportAgedPayables", asOfReportOptions),
      salesByCustomer: () => runReport(qbo, "reportCustomerSales", reportOptions),
      expensesByVendor: () => runReport(qbo, "reportVendorExpenses", reportOptions),
      inventoryValuation: () => runReport(qbo, "reportInventoryValuationSummary", asOfReportOptions),
      budgetVsActuals: () => this.runBudgetVsActualReport(accessToken, realmId, reportOptions),
    };
    const entries = await Promise.all(
      Object.entries(reportRequests).map(async ([key, requestReport]) => {
        try {
          return [key, { ok: true, data: await requestReport() }];
        } catch (error) {
          return [
            key,
            {
              ok: false,
              error: error?.message || "QuickBooks report request failed",
            },
          ];
        }
      }),
    );

    return {
      realm_id: realmId,
      start_date: startDate,
      end_date: endDate,
      company_profile: await this.getCompanyProfile(accessToken, realmId),
      reports: Object.fromEntries(entries),
    };
  }

  async queryEntity(accessToken, realmId, query) {
    return this.makeApiCall(
      accessToken,
      `${this.getBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
    );
  }

  async investigateTransactionDetail({ question, start_date: startDate, end_date: endDate }) {
    const { qbo, accessToken, realmId } = await this.getAuthenticatedClient();
    const normalizedQuestion = String(question || "").toLowerCase();
    const reportOptions = { start_date: startDate, end_date: endDate };
    const queryStartDate = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const queryEndDate = endDate || new Date().toISOString().slice(0, 10);
    const queries = [
      {
        key: "journal_entries",
        label: "Journal Entries",
        query: `select * from JournalEntry where TxnDate >= '${queryStartDate}' and TxnDate <= '${queryEndDate}' maxresults 20`,
      },
      {
        key: "purchases",
        label: "Purchases",
        query: `select * from Purchase where TxnDate >= '${queryStartDate}' and TxnDate <= '${queryEndDate}' maxresults 20`,
      },
      {
        key: "bills",
        label: "Bills",
        query: `select * from Bill where TxnDate >= '${queryStartDate}' and TxnDate <= '${queryEndDate}' maxresults 20`,
      },
      {
        key: "invoices",
        label: "Invoices",
        query: `select * from Invoice where TxnDate >= '${queryStartDate}' and TxnDate <= '${queryEndDate}' maxresults 20`,
      },
      {
        key: "payments",
        label: "Payments",
        query: `select * from Payment where TxnDate >= '${queryStartDate}' and TxnDate <= '${queryEndDate}' maxresults 20`,
      },
      {
        key: "customers",
        label: "Customers",
        query: "select * from Customer maxresults 20",
      },
      {
        key: "vendors",
        label: "Vendors",
        query: "select * from Vendor maxresults 20",
      },
      {
        key: "accounts",
        label: "Chart of Accounts",
        query: "select * from Account maxresults 50",
      },
    ];

    if (normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal")) {
      queries.unshift({
        key: "fixed_assets",
        label: "Fixed Assets",
        query: "select * from FixedAsset maxresults 20",
      });
    }

    const queryResults = await Promise.all(
      queries.map(async (item) => {
        try {
          return [item.key, { ok: true, label: item.label, query: item.query, data: await this.queryEntity(accessToken, realmId, item.query) }];
        } catch (error) {
          return [item.key, { ok: false, label: item.label, query: item.query, error: error?.message || "QuickBooks query failed" }];
        }
      }),
    );

    const reports = await Promise.all(
      [
        ["general_ledger", () => runReport(qbo, "reportGeneralLedgerDetail", reportOptions)],
        ["ar_aging", () => runReport(qbo, "reportAgedReceivables", { report_date: queryEndDate })],
        ["ap_aging", () => runReport(qbo, "reportAgedPayables", { report_date: queryEndDate })],
        ["customer_sales", () => runReport(qbo, "reportCustomerSales", reportOptions)],
        ["vendor_expenses", () => runReport(qbo, "reportVendorExpenses", reportOptions)],
      ].map(async ([key, requestReport]) => {
        try {
          return [key, { ok: true, data: await requestReport() }];
        } catch (error) {
          return [key, { ok: false, error: error?.message || "QuickBooks report request failed" }];
        }
      }),
    );

    return {
      realm_id: realmId,
      date_range: { start_date: queryStartDate, end_date: queryEndDate },
      question_intent: {
        fixed_asset_investigation: normalizedQuestion.includes("asset") || normalizedQuestion.includes("disposed") || normalizedQuestion.includes("disposal"),
        ar_investigation: normalizedQuestion.includes(" ar") || normalizedQuestion.includes("receivable") || normalizedQuestion.includes("customer") || normalizedQuestion.includes("invoice"),
        payroll_investigation: normalizedQuestion.includes("payroll") || normalizedQuestion.includes("employee") || normalizedQuestion.includes("overtime") || normalizedQuestion.includes("hire"),
        expense_investigation: normalizedQuestion.includes("expense") || normalizedQuestion.includes("vendor") || normalizedQuestion.includes("office"),
      },
      query_results: Object.fromEntries(queryResults),
      report_results: Object.fromEntries(reports),
      response_format_required: [
        "Direct answer",
        "Supporting detail",
        "Financial impact",
        "Business implication",
        "Recommended action",
      ],
    };
  }

  async probeUrl(accessToken, url) {
    try {
      await this.makeApiCall(accessToken, url);
      return true;
    } catch {
      return false;
    }
  }

  async detectCapabilities({ currentSubscription = null } = {}) {
    const { accessToken, realmId } = await this.getAuthenticatedClient();
    const today = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const companyProfile = await this.getCompanyProfile(accessToken, realmId);
    const availableReports = [];

    await Promise.all(
      reportChecks.map(async ([label, reportName]) => {
        const params =
          reportName === "BalanceSheet" || reportName === "AgedReceivables" || reportName === "AgedPayables" || reportName === "InventoryValuationSummary"
            ? new URLSearchParams({ report_date: today })
            : new URLSearchParams({ start_date: startDate, end_date: today });
        const ok = await this.probeUrl(accessToken, `${this.getBaseUrl()}/v3/company/${realmId}/reports/${reportName}?${params.toString()}`);
        if (ok) availableReports.push(label);
      }),
    );

    const hasClasses = await this.probeUrl(
      accessToken,
      `${this.getBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent("select * from Class maxresults 1")}`,
    );
    const hasFixedAssets = await this.probeUrl(
      accessToken,
      `${this.getBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent("select * from FixedAsset maxresults 1")}`,
    );

    const capabilities = {
      qbo_version: "Unknown",
      has_payroll: availableReports.includes("PayrollSummary"),
      has_inventory: availableReports.includes("Inventory"),
      has_classes: hasClasses,
      has_budgets: availableReports.includes("BudgetVsActual"),
      has_fixed_assets: hasFixedAssets,
      available_reports: availableReports,
    };
    capabilities.qbo_version = inferQuickBooksVersion(capabilities);

    return {
      ...capabilities,
      company_name: companyProfile.company_name,
      company_legal_name: companyProfile.legal_name,
      ...recommendPackage(capabilities, currentSubscription),
    };
  }
}
