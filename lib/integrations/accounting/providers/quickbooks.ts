import { QuickBooksAdapter } from "../../../erp-adapters/quickbooks-adapter";
import { buildCertificationFixtureReportBundle } from "../normalizers/certification-fixtures";
import { normalizeAccounts } from "../normalizers/accounts";
import { emptyReportBundle, normalizeTabularReportRows } from "../normalizers/reports";
import type {
  AccountingProviderAdapter,
  ConnectedAccountingEntity,
  ProviderCapabilities,
  ProviderRequestParams,
} from "../types";

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
    const raw = await userAdapter.fetchReports({ start_date: dateRange.startDate, end_date: dateRange.endDate });
    const entity = {
      provider: this.provider,
      externalId: raw.realm_id,
      canonicalId: `qbo:${raw.realm_id}`,
      name: raw.company_profile?.company_name || "QuickBooks Company",
      tenantOrRealmId: raw.realm_id,
    };
    const bundle = emptyReportBundle({ provider: this.provider, entity, dateRange });
    const reports = raw.reports || {};

    bundle.profitAndLoss = normalizeTabularReportRows(this.provider, "ProfitAndLoss", reports.profitAndLoss?.data?.Rows?.Row || [], entity.externalId);
    bundle.balanceSheet = normalizeTabularReportRows(this.provider, "BalanceSheet", reports.balanceSheet?.data?.Rows?.Row || [], entity.externalId);
    bundle.cashFlow = normalizeTabularReportRows(this.provider, "CashFlow", reports.cashFlowStatement?.data?.Rows?.Row || [], entity.externalId);
    bundle.missingReports = Object.entries(reports as Record<string, { ok?: boolean }>)
      .filter(([, report]) => !report?.ok)
      .map(([key]) => key);
    bundle.sourceMetadata.raw = raw;
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
