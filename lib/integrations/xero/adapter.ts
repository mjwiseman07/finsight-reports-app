import { getAccountingProviderMappingAdapter } from "../accounting/provider-adapters";
import type {
  AccountingSystemAdapter,
  HistoricalPeriodPullInput,
  InitialPeriodPullInput,
  NormalizedDataContext,
  ReturnNormalizedFinancialDataInput,
} from "../shared/contracts";

const mappingAdapter = getAccountingProviderMappingAdapter("xero");

export const xeroLaneAdapter: AccountingSystemAdapter = {
  sourceSystem: "xero",
  async connect() {
    return { ...await mappingAdapter.connect(), provider: "xero" };
  },
  async fetchInitialPeriodData({ connection, reportPeriod }: InitialPeriodPullInput) {
    return mappingAdapter.fetchRawReports(connection, reportPeriod);
  },
  async fetchHistoricalData({ connection, reportPeriods }: HistoricalPeriodPullInput) {
    return Promise.all(reportPeriods.map((reportPeriod) => mappingAdapter.fetchRawReports(connection, reportPeriod)));
  },
  async normalizeData(rawReports, context: NormalizedDataContext) {
    return mappingAdapter.normalize(rawReports, context);
  },
  validateSourceData(normalizedData) {
    return mappingAdapter.validate(normalizedData);
  },
  async returnNormalizedFinancialData(input: ReturnNormalizedFinancialDataInput) {
    const rawReports = input.rawReports || await mappingAdapter.fetchRawReports(input.connection, input.reportPeriod);
    return mappingAdapter.normalize(rawReports, {
      connection: input.connection,
      reportPeriod: input.reportPeriod,
      syncId: input.syncId,
      tenantId: input.tenantId,
      tenantName: input.tenantName,
    });
  },
};
