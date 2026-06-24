import type {
  RetailForecastInputSource,
  RetailForecastVarianceSection,
  RetailKpiField,
  RetailPerformancePanelContract,
} from "../../../../../dashboard/panels/retail-performance/contract";
import type {
  ComparableStorePeriodPair,
  GiftCardLiability,
  LoyaltyMaterialRight,
  RetailIFRSInventory,
  RetailPanelContext,
  ReturnsReserveIFRS,
  ReturnsReserveUSGAAP,
  StoreImpairmentRouting,
  USGAAPRIMInventory,
} from "../../contracts/retail/RetailBasisContracts";
import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";

export type RetailEvaluatorError =
  | "MISSING_NET_SALES"
  | "MISSING_COMPARABLE_PERIOD"
  | "FISCAL_BOUNDARY_MISMATCH"
  | "IFRS_LIFO_INPUT_REJECTED"
  | "IFRS_RIM_BRANCH_REJECTED"
  | "BASIS_MISMATCH"
  | "GIFT_CARD_ESCHEAT_DOUBLE_COUNT"
  | "RETURNS_NET_PRESENTATION_REJECTED"
  | "LOYALTY_TIER_STATUS_MISROUTED"
  | "STORE_CGU_BASIS_MISROUTED"
  | "LEASE_FRAMEWORK_LITERAL_REJECTED"
  | "SUB_SEGMENT_FIELD_UNAVAILABLE"
  | "MISSING_RETURNS_RESERVE"
  | "UNAUTHORIZED"
  | "SPINE_READ_FAILED"
  | "SURFACE_CANDIDATE_BUILD_FAILED";

export type RetailEvaluatorResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RetailEvaluatorError };

export interface RetailOperatingInputs {
  comparableSalesCurrent: number;
  comparableSalesPrior: number;
  trafficCount: number;
  transactionsOrOrders: number;
  trafficOrSessions: number;
  totalRevenue: number;
  numberOfOrders: number;
  totalUnitsSold: number;
  numberOfTransactions: number;
  cogs: number;
  averageInventoryAtCost: number;
  unitsSold: number;
  unitsReceived: number;
  bookInventory: number;
  physicalInventory: number;
  returnedMerchandise: number;
  grossSales: number;
  sellingAreaSqFt: number;
  onlineSessions: number;
  cartsCreated: number;
  completedPurchases: number;
  totalSalesAndMarketingSpend: number;
  newCustomersAcquired: number;
  pickupsWithIncrementalPurchase?: number;
  totalPickups?: number;
}

export interface RetailForecastInputs {
  forecastHorizon: { periodsAhead: number };
  forecastInputSource: RetailForecastInputSource;
  operating: RetailOperatingInputs;
}

export interface RetailEvaluatorInputs {
  companyId: string;
  accountingPeriod: string;
  context: RetailPanelContext;
  netSalesForPeriod: number;
  comparableStoreCount: number;
  compPeriodPair: ComparableStorePeriodPair;
  inventory:
    | { basis: "US_GAAP"; rim?: USGAAPRIMInventory }
    | { basis: "IFRS"; ifrs: RetailIFRSInventory };
  giftCard?: GiftCardLiability;
  loyalty?: LoyaltyMaterialRight;
  returnsReserve?: ReturnsReserveUSGAAP | ReturnsReserveIFRS;
  storeImpairment?: StoreImpairmentRouting;
  operating: RetailOperatingInputs;
  forecast?: RetailForecastInputs;
}

export interface RetailRouteDecision {
  decision: "ALLOW" | "DENY";
  expected: "ALLOW" | "DENY";
  reason: string;
}

export interface RetailRoutingDiagnostics {
  giftCard: RetailRouteDecision;
  loyalty: RetailRouteDecision;
  returnsReserve: RetailRouteDecision;
  storeImpairment: RetailRouteDecision;
}

export interface RetailEvaluatorPanelOutput extends RetailPerformancePanelContract {
  routingDiagnostics: RetailRoutingDiagnostics;
}

export interface RetailForecastComputation {
  forecastVarianceSection: RetailForecastVarianceSection;
}

export function assertReportingBasisConsistency(
  reportingBasis: ReportingBasis,
  applicableBasis: ReportingBasis,
): RetailEvaluatorResult<void> {
  if (reportingBasis !== applicableBasis) {
    return { ok: false, error: "BASIS_MISMATCH" };
  }
  return { ok: true, value: undefined };
}

export function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function safePercent(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return (numerator / denominator) * 100;
}

export function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

export function baseDeniedDecision(reason: string): RetailRouteDecision {
  return { decision: "DENY", expected: "DENY", reason };
}

export function baseAllowedDecision(reason: string): RetailRouteDecision {
  return { decision: "ALLOW", expected: "ALLOW", reason };
}

export type RetailKpiComputationResult = RetailEvaluatorResult<RetailKpiField>;
