/**
 * PR G — CanonicalFinancialContext
 *
 * Thin façade over existing Scorecard / active-context authority.
 * ZERO new KPI math. Composes reportDataContext + authoritativePersistence
 * + allowlisted Scorecard view helpers only.
 *
 * Does NOT replace getActiveAccountingContext or become a parallel accounting engine.
 */
import { buildActiveReportSummary, type ActiveReportSummaryView } from "./active-report-summary";
import { toScorecardArAgingView, type CanonicalArAgingSchedule } from "./ar-aging";
import { toScorecardCashFlowTrailing, type CanonicalCashFlowSchedule } from "./cash-flow";
import type { AuthoritativePersistenceProof } from "./payload-schema";
import type { ReportDataContext } from "./report-data-context";
import { resolveNorthStar } from "../../scorecard/industry-north-star";
import type {
  AccountingDateRange,
  AdvisacorNormalizedFinancialData,
} from "./types";

export type TruthClass = "ACTUAL" | "FORECAST" | "SCENARIO" | "BENCHMARK" | "MEMORY";

export type AccountingAuthorityIdentity = {
  companyId: string;
  connectionId: string;
  sourceSystem: string;
  tenantOrRealmId: string | null;
  syncId: string;
  reportPeriod: AccountingDateRange & { label?: string };
  schemaVersion: number;
  authoritativePersistence: AuthoritativePersistenceProof;
};

export type CanonicalFinancialContext = {
  identity: AccountingAuthorityIdentity;
  reportDataContext: ReportDataContext;
  normalizedData: AdvisacorNormalizedFinancialData;
  authoritativePersistence: AuthoritativePersistenceProof;
  views: {
    summary: ActiveReportSummaryView | null;
    arAging: ReturnType<typeof toScorecardArAgingView> | null;
    cashFlowTrailing: ReturnType<typeof toScorecardCashFlowTrailing> | null;
    northStar: ReturnType<typeof resolveNorthStar>;
  };
  provenance: {
    syncId: string;
    accuracyContractParams: {
      companyId: string;
      syncId: string;
      connectionId: string;
      period: string;
    };
  };
  display: {
    companyName: string;
    industryType: string | null;
  };
  assertActual: () => void;
};

export type ActiveAccountingContextLike = {
  companyId?: string | null;
  connectionId?: string | null;
  sourceSystem?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  syncId?: string | null;
  latestSuccessfulSyncId?: string | null;
  schemaVersion?: number | null;
  reportPeriod?: AccountingDateRange | null;
  normalizedData?: AdvisacorNormalizedFinancialData | null;
  reportDataContext?: ReportDataContext | null;
  authoritativePersistence?: AuthoritativePersistenceProof | null;
};

/**
 * Derive Accuracy Contract period key (YYYY-MM) from sync report period end.
 */
export function deriveAccuracyContractPeriod(
  reportPeriod: AccountingDateRange | null | undefined,
): string | null {
  const end = String(reportPeriod?.endDate || "").trim();
  const match = end.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

/**
 * Resolve the single authoritative syncId from an active-context payload.
 * Prefers explicit syncId, then latestSuccessfulSyncId, then reportDataContext.syncId.
 */
export function resolveActiveAuthoritativeSyncId(
  payload: ActiveAccountingContextLike | null | undefined,
): string | null {
  const candidates = [
    payload?.syncId,
    payload?.latestSuccessfulSyncId,
    payload?.reportDataContext?.syncId,
    payload?.authoritativePersistence?.syncId,
    payload?.authoritativePersistence?.activeNormalizedSyncId,
  ];
  for (const value of candidates) {
    const id = String(value || "").trim();
    if (id && !id.startsWith("metadata:")) return id;
  }
  return null;
}

function displayCompanyName(payload: ActiveAccountingContextLike, fallback?: string | null): string {
  return (
    String(payload.tenantName || "").trim() ||
    String(payload.normalizedData?.tenantName || "").trim() ||
    String(fallback || "").trim() ||
    "Not provided"
  );
}

/**
 * Build CanonicalFinancialContext from an already-hydrated active-context payload.
 * Returns null when identity or persistence proof is insufficient for ACTUAL.
 */
export function buildCanonicalFinancialContext(args: {
  activeContext: ActiveAccountingContextLike;
  industryType?: string | null;
  companyNameFallback?: string | null;
}): CanonicalFinancialContext | null {
  const { activeContext } = args;
  const reportDataContext = activeContext.reportDataContext || null;
  const normalizedData = (reportDataContext?.normalizedData || activeContext.normalizedData) as
    | AdvisacorNormalizedFinancialData
    | null
    | undefined;
  const persistence = activeContext.authoritativePersistence || null;
  const syncId = resolveActiveAuthoritativeSyncId(activeContext);
  const companyId = String(
    activeContext.companyId || reportDataContext?.companyId || normalizedData?.companyId || "",
  ).trim();
  const connectionId = String(
    activeContext.connectionId || reportDataContext?.connectionId || normalizedData?.connectionId || "",
  ).trim();
  const sourceSystem = String(
    activeContext.sourceSystem || reportDataContext?.sourceSystem || normalizedData?.sourceSystem || "",
  ).trim();
  const reportPeriod = (reportDataContext?.reportPeriod || activeContext.reportPeriod || null) as
    | (AccountingDateRange & { label?: string })
    | null;
  const schemaVersion = Number(
    activeContext.schemaVersion || normalizedData?.schemaVersion || persistence?.schemaVersion || 0,
  );
  const periodKey = deriveAccuracyContractPeriod(reportPeriod);

  if (!syncId || !companyId || !connectionId || !sourceSystem || !reportPeriod?.startDate || !reportPeriod?.endDate) {
    return null;
  }
  if (!normalizedData || !reportDataContext || !persistence) {
    return null;
  }
  if (!persistence.ok || !persistence.persisted) {
    return null;
  }
  if (persistence.syncId !== syncId || persistence.activeNormalizedSyncId !== syncId) {
    return null;
  }
  if (!periodKey) {
    return null;
  }

  const identity: AccountingAuthorityIdentity = {
    companyId,
    connectionId,
    sourceSystem,
    tenantOrRealmId: String(activeContext.tenantId || reportDataContext.tenantId || normalizedData.tenantId || "") || null,
    syncId,
    reportPeriod,
    schemaVersion,
    authoritativePersistence: persistence,
  };

  const arSchedule = (normalizedData.canonicalArAgingSchedule || null) as CanonicalArAgingSchedule | null;
  const cfSchedule = (normalizedData.canonicalCashFlowSchedule || null) as CanonicalCashFlowSchedule | null;

  const summaryPayload = {
    reportDataContext: reportDataContext as unknown as Record<string, unknown>,
    normalizedData,
    tenantName: activeContext.tenantName || reportDataContext.tenantName,
    diagnostics: reportDataContext.diagnostics as Record<string, unknown> | undefined,
  };

  const ctx: CanonicalFinancialContext = {
    identity,
    reportDataContext,
    normalizedData,
    authoritativePersistence: persistence,
    views: {
      summary: buildActiveReportSummary(summaryPayload),
      arAging: arSchedule ? toScorecardArAgingView(arSchedule) : null,
      cashFlowTrailing: toScorecardCashFlowTrailing(cfSchedule),
      northStar: resolveNorthStar(args.industryType),
    },
    provenance: {
      syncId,
      accuracyContractParams: {
        companyId,
        syncId,
        connectionId,
        period: periodKey,
      },
    },
    display: {
      companyName: displayCompanyName(activeContext, args.companyNameFallback),
      industryType: args.industryType || null,
    },
    assertActual: () => {
      if (!persistence.ok || !persistence.persisted || persistence.syncId !== syncId) {
        throw new Error("CanonicalFinancialContext is not proven for ACTUAL rendering.");
      }
    },
  };

  return ctx;
}

/**
 * Query params for GET /api/dashboard/accuracy-contract — always includes pinned syncId.
 */
export function buildAccuracyContractQuery(args: {
  kpiCode: string;
  companyId: string;
  syncId: string;
  period: string;
  connectionId?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("kpi_code", args.kpiCode);
  params.set("period", args.period);
  params.set("companyId", args.companyId);
  params.set("syncId", args.syncId);
  if (args.connectionId) params.set("connectionId", args.connectionId);
  return params;
}
