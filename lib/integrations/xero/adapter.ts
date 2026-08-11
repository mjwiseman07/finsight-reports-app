import { getAccountingProviderMappingAdapter } from "../accounting/provider-adapters";
import type {
  HistoricalPeriodPullInput,
  InitialPeriodPullInput,
  NormalizedDataContext,
  ReturnNormalizedFinancialDataInput,
} from "../shared/contracts";

const mappingAdapter = getAccountingProviderMappingAdapter("xero");

/**
 * W1c.2: read-only lane adapter. Write methods now live on
 * XeroWriteProvider (lib/integrations/xero/accounting-provider.ts)
 * which composes this read surface with the write-boundary module.
 *
 * W1a stub write wrappers were removed in W1c.2. Any caller that still needs the
 * AccountingSystemAdapter shape MUST import xeroWriteProvider instead.
 */
export const xeroLaneAdapter = {
  sourceSystem: "xero" as const,
  async connect() {
    return { ...(await mappingAdapter.connect()), provider: "xero" as const };
  },
  async fetchInitialPeriodData({ connection, reportPeriod }: InitialPeriodPullInput) {
    return mappingAdapter.fetchRawReports(connection, reportPeriod);
  },
  async fetchHistoricalData({ connection, reportPeriods }: HistoricalPeriodPullInput) {
    return Promise.all(
      reportPeriods.map((reportPeriod) => mappingAdapter.fetchRawReports(connection, reportPeriod)),
    );
  },
  async normalizeData(rawReports: unknown, context: NormalizedDataContext) {
    return mappingAdapter.normalize(rawReports as never, context);
  },
  validateSourceData(normalizedData: unknown) {
    return mappingAdapter.validate(normalizedData as never);
  },
  async returnNormalizedFinancialData(input: ReturnNormalizedFinancialDataInput) {
    const rawReports =
      input.rawReports || (await mappingAdapter.fetchRawReports(input.connection, input.reportPeriod));
    return mappingAdapter.normalize(rawReports as never, {
      connection: input.connection,
      reportPeriod: input.reportPeriod,
      syncId: input.syncId,
      tenantId: input.tenantId,
      tenantName: input.tenantName,
    });
  },
};
