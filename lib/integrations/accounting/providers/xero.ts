import { normalizeAccounts } from "../normalizers/accounts";
import { emptyReportBundle, normalizeTabularReportRows } from "../normalizers/reports";
import type { AccountingProviderAdapter, ProviderCapabilities, ProviderRequestParams } from "../types";

export const XERO_SCOPES = [
  "offline_access",
  "accounting.settings.read",
  "accounting.reports.read",
  "accounting.transactions.read",
].join(" ");

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

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
      scope: XERO_SCOPES,
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
    return entities.find((entity) => entity.canonicalId === params.entityId || entity.externalId === params.entityId) || entities[0];
  }

  async xeroGet(connection: ProviderRequestParams["connection"], path: string) {
    const tenantId = connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^xero:/, "") || "";
    const response = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.Message || payload?.Detail || `Xero request failed: ${path}`);
    return payload;
  }

  async getChartOfAccounts(params: ProviderRequestParams) {
    const payload = await this.xeroGet(params.connection, "Accounts");
    return normalizeAccounts(this.provider, payload.Accounts || [], params.connection.external_entity_id || undefined);
  }

  async getTrialBalance() {
    return [];
  }

  async getProfitAndLoss(params: ProviderRequestParams) {
    const payload = await this.xeroGet(params.connection, `Reports/ProfitAndLoss?fromDate=${params.dateRange?.startDate || ""}&toDate=${params.dateRange?.endDate || ""}`);
    return normalizeTabularReportRows(this.provider, "ProfitAndLoss", payload.Reports?.[0]?.Rows || [], params.connection.external_entity_id || undefined);
  }

  async getBalanceSheet(params: ProviderRequestParams) {
    const payload = await this.xeroGet(params.connection, `Reports/BalanceSheet?date=${params.dateRange?.endDate || ""}`);
    return normalizeTabularReportRows(this.provider, "BalanceSheet", payload.Reports?.[0]?.Rows || [], params.connection.external_entity_id || undefined);
  }

  async getCashFlow() {
    return [];
  }

  async getPrimaryFinancialReports(params: ProviderRequestParams) {
    const entity = await this.selectEntity(params);
    const bundle = emptyReportBundle({ provider: this.provider, entity, dateRange: params.dateRange!, missingReports: ["cash_flow"] });
    bundle.chartOfAccounts = await this.getChartOfAccounts(params).catch(() => []);
    bundle.profitAndLoss = await this.getProfitAndLoss(params).catch(() => []);
    bundle.balanceSheet = await this.getBalanceSheet(params).catch(() => []);
    return bundle;
  }

  async disconnect() {}

  getCapabilities(): ProviderCapabilities {
    return {
      supports_oauth: true,
      supports_multi_entity: true,
      supports_chart_of_accounts: true,
      supports_trial_balance: false,
      supports_pnl: true,
      supports_balance_sheet: true,
      supports_cash_flow: false,
      supports_webhooks: true,
      supports_writeback: false,
      requires_entity_selection: true,
      supports_incremental_sync: false,
      fallback_notes: ["Cash flow and trial balance may require file import/manual upload depending on Xero plan and region."],
    };
  }
}

export const xeroAccountingProvider = new XeroAccountingProvider();
