import type {
  AccountingConnectionRecord,
  AccountingDateRange,
  AccountingProvider,
  AdvisacorNormalizedFinancialData,
  ProviderRawReports,
} from "../../accounting/types";

export type AccountingSystemAdapterSource = Extract<AccountingProvider, "quickbooks" | "xero">;

export type AccountingSystemConnectionResult = {
  provider: AccountingSystemAdapterSource;
};

export type InitialPeriodPullInput = {
  connection: AccountingConnectionRecord;
  reportPeriod: AccountingDateRange;
};

export type HistoricalPeriodPullInput = {
  connection: AccountingConnectionRecord;
  reportPeriods: AccountingDateRange[];
};

export type NormalizedDataContext = {
  connection: AccountingConnectionRecord;
  reportPeriod: AccountingDateRange;
  syncId: string;
  tenantId: string | null;
  tenantName: string;
};

export type ReturnNormalizedFinancialDataInput = NormalizedDataContext & {
  rawReports?: ProviderRawReports;
};

export type SourceValidationResult = {
  readyForReporting: boolean;
  missingObjects: string[];
  warnings: string[];
};

export interface AccountingSystemAdapter {
  sourceSystem: AccountingSystemAdapterSource;
  connect(): Promise<AccountingSystemConnectionResult>;
  fetchInitialPeriodData(input: InitialPeriodPullInput): Promise<ProviderRawReports>;
  fetchHistoricalData(input: HistoricalPeriodPullInput): Promise<ProviderRawReports[]>;
  normalizeData(rawReports: ProviderRawReports, context: NormalizedDataContext): Promise<AdvisacorNormalizedFinancialData>;
  validateSourceData(normalizedData: AdvisacorNormalizedFinancialData): SourceValidationResult;
  returnNormalizedFinancialData(input: ReturnNormalizedFinancialDataInput): Promise<AdvisacorNormalizedFinancialData>;
}
