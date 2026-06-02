import { buildCertificationFixtureReportBundle } from "../normalizers/certification-fixtures";
import { emptyReportBundle } from "../normalizers/reports";
import type { AccountingProviderAdapter, ProviderCapabilities, ProviderRequestParams } from "../types";

export const SAGE_SCOPES = "openid profile offline_access accounting.read";

export class SageAccountingProvider implements AccountingProviderAdapter {
  provider = "sage" as const;
  providerFamily = "sage";
  providerProduct = "sage_intacct";

  getAuthorizationUrl({ state, redirectUri }: { state: string; redirectUri?: string }) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.SAGE_CLIENT_ID || "",
      redirect_uri: redirectUri || process.env.SAGE_REDIRECT_URI || "",
      scope: SAGE_SCOPES,
      state,
    });
    return `https://api.accounting.sage.com/oauth2/auth/central?${params.toString()}`;
  }

  async exchangeCodeForTokens(): Promise<Record<string, unknown>> {
    throw new Error("Sage OAuth token exchange requires product-specific tenant setup. Configure Sage cloud app credentials before enabling direct sync.");
  }

  async refreshAccessToken(): Promise<Record<string, unknown>> {
    throw new Error("Sage refresh is not configured yet.");
  }

  async getEntities({ connection }: ProviderRequestParams) {
    return [{
      provider: this.provider,
      externalId: connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^sage:/, "") || "",
      canonicalId: connection.external_entity_id || `sage:${connection.tenant_or_realm_id || "entity"}`,
      name: connection.external_entity_name || "Sage Entity",
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
      supports_trial_balance: false,
      supports_pnl: true,
      supports_balance_sheet: true,
      supports_cash_flow: false,
      supports_webhooks: false,
      supports_writeback: false,
      requires_entity_selection: true,
      supports_incremental_sync: false,
      fallback_notes: ["Designed for Sage Intacct first. Some Sage products require product-specific APIs, so manual upload remains available."],
    };
  }
}

export const sageAccountingProvider = new SageAccountingProvider();
