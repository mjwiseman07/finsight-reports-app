export type AccountingProvider = "quickbooks" | "xero" | "sage" | "netsuite" | "dynamics365";
export type AccountingSourceSystem = AccountingProvider | "dynamics";
export type AccountingMappingAdapterName =
  | "quickBooksAdapter"
  | "xeroAdapter"
  | "netSuiteAdapter"
  | "dynamicsAdapter"
  | "sageAdapter";
export type AccountingSyncStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export type AccountingConnectionStatus = "pending" | "connected" | "needs_entity_selection" | "expired" | "disconnected" | "failed";

export interface AccountingConnectionRecord {
  id: string;
  user_id: string;
  provider: AccountingProvider;
  provider_family: string;
  provider_product: string;
  external_entity_id: string | null;
  external_entity_name: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  tenant_or_realm_id?: string | null;
  scopes: string[];
  status: AccountingConnectionStatus;
  metadata_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ConnectedAccountingEntity {
  provider: AccountingProvider;
  externalId: string;
  canonicalId: string;
  name: string;
  tenantOrRealmId?: string;
  metadata?: Record<string, unknown>;
}

export interface AccountingAuthState {
  state: string;
  userId: string;
  provider: AccountingProvider;
  returnTo?: string;
}

export interface AccountingDateRange {
  startDate: string;
  endDate: string;
}

export interface CanonicalSourceMetadata {
  provider: AccountingProvider;
  providerFamily: string;
  providerProduct?: string;
  externalEntityId?: string;
  externalRecordId?: string;
  sourceReport?: string;
  raw?: unknown;
  // Phase MC-1 (Issue #6, Gap I-2): home currency threading. Optional so all
  // existing constructors remain valid; populated by providers that capture it.
  home_currency?: string;
  multicurrency_enabled?: boolean;
}

export interface CanonicalChartOfAccountsItem {
  id: string;
  name: string;
  accountNumber?: string;
  accountType?: string;
  accountClass?: string;
  status?: string;
  currency?: string;
  parentId?: string;
  active: boolean;
  source: CanonicalSourceMetadata;
}

export interface CanonicalTrialBalanceRow {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  netAmount: number;
  source: CanonicalSourceMetadata;
}

export interface CanonicalPnLRow {
  label: string;
  amount: number;
  section?: string;
  source: CanonicalSourceMetadata;
}

export interface CanonicalBalanceSheetRow {
  label: string;
  amount: number;
  section?: string;
  source: CanonicalSourceMetadata;
}

export interface CanonicalCashFlowRow {
  label: string;
  amount: number;
  section?: string;
  source: CanonicalSourceMetadata;
}

export interface AdvisacorNormalizedEntity {
  id: string;
  name: string;
  type?: string;
  balance?: number;
  amount?: number;
  metadata?: Record<string, unknown>;
  source: CanonicalSourceMetadata;
}

export interface AdvisacorNormalizedFinancialData {
  sourceSystem: AccountingProvider;
  adapterName: AccountingMappingAdapterName;
  companyId: string | null;
  connectionId: string;
  tenantId: string | null;
  tenantName: string;
  syncId: string;
  reportPeriod: AccountingDateRange;
  mappedAt: string;
  rawReportsPulled: {
    accounts: boolean;
    trialBalance: boolean;
    balanceSheet: boolean;
    incomeStatement: boolean;
    arAging: boolean;
    apAging: boolean;
  };
  syncStatus: AccountingSyncStatus;
  lastSyncedAt: string;
  normalizedAccounts: CanonicalChartOfAccountsItem[];
  normalizedTransactions: AdvisacorNormalizedEntity[];
  normalizedTrialBalance: CanonicalTrialBalanceRow[];
  normalizedBalanceSheet: CanonicalBalanceSheetRow[];
  normalizedIncomeStatement: CanonicalPnLRow[];
  normalizedIncomeStatementYtd?: CanonicalPnLRow[];
  normalizedARAging: AdvisacorNormalizedEntity[];
  normalizedAPAging: AdvisacorNormalizedEntity[];
  normalizedBudgets: AdvisacorNormalizedEntity[];
  normalizedDepartments: AdvisacorNormalizedEntity[];
  normalizedLocations: AdvisacorNormalizedEntity[];
  normalizedClasses: AdvisacorNormalizedEntity[];
  normalizedProjects: AdvisacorNormalizedEntity[];
  normalizedVendors: AdvisacorNormalizedEntity[];
  normalizedCustomers: AdvisacorNormalizedEntity[];
  // Phase MC-2c (Issue #6, Gap R-2): tenant home currency threaded from
  // bundle.sourceMetadata.home_currency (which MC-1 captured from the
  // provider). Optional so all existing constructors remain valid. Formatters
  // downstream (PDF, close packet, UI) read this to render figures in the
  // tenant's currency instead of hardcoded USD.
  home_currency?: string;
  multicurrency_enabled?: boolean;
  validation: {
    readyForReporting: boolean;
    missingObjects: string[];
    warnings: string[];
  };
}

export interface CanonicalReportBundle {
  provider: AccountingProvider;
  entity: ConnectedAccountingEntity | null;
  dateRange: AccountingDateRange;
  chartOfAccounts: CanonicalChartOfAccountsItem[];
  trialBalance: CanonicalTrialBalanceRow[];
  profitAndLoss: CanonicalPnLRow[];
  profitAndLossYtd?: CanonicalPnLRow[];
  balanceSheet: CanonicalBalanceSheetRow[];
  cashFlow: CanonicalCashFlowRow[];
  normalizedTransactions?: AdvisacorNormalizedEntity[];
  normalizedARAging?: AdvisacorNormalizedEntity[];
  normalizedAPAging?: AdvisacorNormalizedEntity[];
  normalizedBudgets?: AdvisacorNormalizedEntity[];
  normalizedDepartments?: AdvisacorNormalizedEntity[];
  normalizedLocations?: AdvisacorNormalizedEntity[];
  normalizedClasses?: AdvisacorNormalizedEntity[];
  normalizedProjects?: AdvisacorNormalizedEntity[];
  normalizedVendors?: AdvisacorNormalizedEntity[];
  normalizedCustomers?: AdvisacorNormalizedEntity[];
  missingReports: string[];
  sourceMetadata: CanonicalSourceMetadata;
}

export interface AccountingSyncResult {
  ok: boolean;
  provider: AccountingProvider;
  connectionId?: string;
  bundle?: CanonicalReportBundle;
  normalizedData?: AdvisacorNormalizedFinancialData;
  reportDataContext?: unknown;
  syncId?: string;
  diagnostics?: {
    sourceSystem: AccountingProvider;
    tenantName: string;
    accountsCount: number;
    trialBalanceCount: number;
    balanceSheetCount: number;
    incomeStatementCount: number;
    xeroRawAccountsCount?: number;
    xeroMappedAccountsCount?: number;
    xeroRawTrialBalanceFlattenedRowsCount?: number;
    xeroMappedTrialBalanceRowsCount?: number;
    xeroRawBalanceSheetFlattenedRowsCount?: number;
    xeroMappedBalanceSheetRowsCount?: number;
    xeroRawProfitAndLossFlattenedRowsCount?: number;
    xeroMappedIncomeStatementRowsCount?: number;
  };
  message?: string;
  missingReports: string[];
  warnings: string[];
}

export interface ConnectionResult {
  url?: string;
  state?: string;
  provider?: AccountingProvider;
  connectionId?: string;
}

export interface ProviderRawReports {
  sourceSystem: AccountingProvider;
  adapterName: AccountingMappingAdapterName;
  bundle: CanonicalReportBundle;
  rawReportsPulled: AdvisacorNormalizedFinancialData["rawReportsPulled"];
}

export interface ProviderValidationResult {
  readyForReporting: boolean;
  missingObjects: string[];
  warnings: string[];
}

export interface AccountingProviderMappingAdapter {
  sourceSystem: AccountingProvider;
  adapterName: AccountingMappingAdapterName;
  connect(): Promise<ConnectionResult>;
  fetchRawReports(connection: AccountingConnectionRecord, reportPeriod: AccountingDateRange): Promise<ProviderRawReports>;
  normalize(
    rawReports: ProviderRawReports,
    context: {
      connection: AccountingConnectionRecord;
      reportPeriod: AccountingDateRange;
      syncId: string;
      tenantId: string | null;
      tenantName: string;
    },
  ): Promise<AdvisacorNormalizedFinancialData>;
  validate(normalizedData: AdvisacorNormalizedFinancialData): ProviderValidationResult;
}

export interface ProviderCapabilities {
  supports_oauth: boolean;
  supports_multi_entity: boolean;
  supports_chart_of_accounts: boolean;
  supports_trial_balance: boolean;
  supports_pnl: boolean;
  supports_balance_sheet: boolean;
  supports_cash_flow: boolean;
  supports_webhooks: boolean;
  supports_writeback: boolean;
  requires_entity_selection: boolean;
  supports_incremental_sync: boolean;
  fallback_notes?: string[];
}

export interface AuthorizationUrlParams {
  state: string;
  redirectUri?: string;
  returnTo?: string;
  userId?: string;
}

export interface ExchangeCodeParams {
  code: string;
  redirectUri?: string;
  tenantOrRealmId?: string;
  state?: string;
}

export interface RefreshTokenParams {
  refreshToken: string;
  connection?: AccountingConnectionRecord;
}

export interface ProviderRequestParams {
  connection: AccountingConnectionRecord;
  dateRange?: AccountingDateRange;
  entityId?: string;
}

export interface AccountingProviderAdapter {
  provider: AccountingProvider;
  providerFamily: string;
  providerProduct: string;
  getAuthorizationUrl(params: AuthorizationUrlParams): Promise<string> | string;
  exchangeCodeForTokens(params: ExchangeCodeParams): Promise<Record<string, unknown>>;
  refreshAccessToken(params: RefreshTokenParams): Promise<Record<string, unknown>>;
  getEntities(params: ProviderRequestParams): Promise<ConnectedAccountingEntity[]>;
  selectEntity(params: ProviderRequestParams): Promise<ConnectedAccountingEntity>;
  getChartOfAccounts(params: ProviderRequestParams): Promise<CanonicalChartOfAccountsItem[]>;
  getTrialBalance(params: ProviderRequestParams): Promise<CanonicalTrialBalanceRow[]>;
  getProfitAndLoss(params: ProviderRequestParams): Promise<CanonicalPnLRow[]>;
  getBalanceSheet(params: ProviderRequestParams): Promise<CanonicalBalanceSheetRow[]>;
  getCashFlow(params: ProviderRequestParams): Promise<CanonicalCashFlowRow[]>;
  getPrimaryFinancialReports(params: ProviderRequestParams): Promise<CanonicalReportBundle>;
  disconnect(params: ProviderRequestParams): Promise<void>;
  getCapabilities(): ProviderCapabilities;
}
