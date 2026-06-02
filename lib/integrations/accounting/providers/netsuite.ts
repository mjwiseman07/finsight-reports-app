import { buildCertificationFixtureReportBundle } from "../normalizers/certification-fixtures";
import { emptyReportBundle } from "../normalizers/reports";
import type { AccountingProviderAdapter, ProviderCapabilities, ProviderRequestParams } from "../types";

export class NetSuiteAccountingProvider implements AccountingProviderAdapter {
  provider = "netsuite" as const;
  providerFamily = "oracle";
  providerProduct = "netsuite_suitetalk_rest";

  getAuthorizationUrl({ state, redirectUri }: { state: string; redirectUri?: string }) {
    const accountId = process.env.NETSUITE_ACCOUNT_ID || "";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.NETSUITE_CLIENT_ID || "",
      redirect_uri: redirectUri || process.env.NETSUITE_REDIRECT_URI || "",
      scope: "rest_webservices",
      state,
    });
    return `https://${accountId.toLowerCase().replace("_", "-")}.app.netsuite.com/app/login/oauth2/authorize.nl?${params.toString()}`;
  }

  async exchangeCodeForTokens(): Promise<Record<string, unknown>> {
    throw new Error("NetSuite OAuth exchange requires account-specific REST role setup. Configure SuiteTalk REST OAuth 2.0 before enabling direct sync.");
  }

  async refreshAccessToken(): Promise<Record<string, unknown>> {
    throw new Error("NetSuite refresh is not configured yet.");
  }

  async getEntities({ connection }: ProviderRequestParams) {
    return [{
      provider: this.provider,
      externalId: connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^netsuite:/, "") || "",
      canonicalId: connection.external_entity_id || `netsuite:${connection.tenant_or_realm_id || "entity"}`,
      name: connection.external_entity_name || "NetSuite Entity",
      tenantOrRealmId: connection.tenant_or_realm_id || "",
    }];
  }

  async selectEntity(params: ProviderRequestParams) {
    const [entity] = await this.getEntities(params);
    return entity;
  }

  async getChartOfAccounts() { return []; }
  async getTrialBalance() { return []; }
  async getProfitAndLoss() { return []; }
  async getBalanceSheet() { return []; }
  async getCashFlow() { return []; }

  async getPrimaryFinancialReports(params: ProviderRequestParams) {
    const entity = await this.selectEntity(params);
    const fixture = params.connection.metadata_json?.certification_fixture;
    if (fixture && typeof fixture === "object") {
      return buildCertificationFixtureReportBundle({
        provider: this.provider,
        entity,
        dateRange: params.dateRange!,
        fixture,
      });
    }

    // TODO: Add SuiteQL/RESTlet extraction for advanced enterprise finance setups.
    return emptyReportBundle({
      provider: this.provider,
      entity,
      dateRange: params.dateRange!,
      missingReports: ["chart_of_accounts", "trial_balance", "profit_and_loss", "balance_sheet", "cash_flow"],
    });
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
      supports_cash_flow: true,
      supports_webhooks: false,
      supports_writeback: false,
      requires_entity_selection: true,
      supports_incremental_sync: false,
      fallback_notes: ["NetSuite role/permission mapping is enterprise-specific. SuiteQL or RESTlets may be needed for advanced extraction."],
    };
  }
}

export const netSuiteAccountingProvider = new NetSuiteAccountingProvider();
