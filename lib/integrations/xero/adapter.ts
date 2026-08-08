import { getAccountingProviderMappingAdapter } from "../accounting/provider-adapters";
import type {
  HistoricalPeriodPullInput,
  InitialPeriodPullInput,
  NormalizedDataContext,
  ReturnNormalizedFinancialDataInput,
} from "../shared/contracts";
import { withStubWriteMethods } from "../shared/contracts";

const mappingAdapter = getAccountingProviderMappingAdapter("xero");

/** W1a: read surface only; write methods are stubs until W1c. */
export const xeroLaneAdapter = withStubWriteMethods({
  sourceSystem: "xero" as const,
  async connect() {
    return { ...(await mappingAdapter.connect()), provider: "xero" as const };
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
    const rawReports = input.rawReports || (await mappingAdapter.fetchRawReports(input.connection, input.reportPeriod));
    return mappingAdapter.normalize(rawReports, {
      connection: input.connection,
      reportPeriod: input.reportPeriod,
      syncId: input.syncId,
      tenantId: input.tenantId,
      tenantName: input.tenantName,
    });
  },
});
