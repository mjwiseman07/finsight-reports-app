import { buildCertificationFixtureReportBundle } from "../normalizers/certification-fixtures";
import { emptyReportBundle } from "../normalizers/reports";
import type { AccountingProviderAdapter, ProviderCapabilities, ProviderRequestParams } from "../types";

export const DYNAMICS365_SCOPES = "https://api.businesscentral.dynamics.com/.default offline_access";

export class Dynamics365AccountingProvider implements AccountingProviderAdapter {
  provider = "dynamics365" as const;
  providerFamily = "microsoft";
  providerProduct = "business_central";

  getAuthorizationUrl({ state, redirectUri }: { state: string; redirectUri?: string }) {
    const tenantId = process.env.DYNAMICS365_TENANT_ID || "common";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.DYNAMICS365_CLIENT_ID || "",
      redirect_uri: redirectUri || process.env.DYNAMICS365_REDIRECT_URI || "",
      scope: DYNAMICS365_SCOPES,
      state,
    });
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(): Promise<Record<string, unknown>> {
    throw new Error("Dynamics 365 Business Central OAuth exchange requires Microsoft Entra app setup before enabling direct sync.");
  }

  async refreshAccessToken(): Promise<Record<string, unknown>> {
    throw new Error("Dynamics 365 refresh is not configured yet.");
  }

  async getEntities({ connection }: ProviderRequestParams) {
    return [{
      provider: this.provider,
      externalId: connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^dynamics365:/, "") || "",
      canonicalId: connection.external_entity_id || `dynamics365:${connection.tenant_or_realm_id || "company"}`,
      name: connection.external_entity_name || "Business Central Company",
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
      supports_trial_balance: true,
      supports_pnl: true,
      supports_balance_sheet: true,
      supports_cash_flow: false,
      supports_webhooks: true,
      supports_writeback: false,
      requires_entity_selection: true,
      supports_incremental_sync: false,
      fallback_notes: ["Built for Dynamics 365 Business Central first. Other Dynamics finance products can be added behind this provider family later."],
    };
  }
}

export const dynamics365AccountingProvider = new Dynamics365AccountingProvider();
