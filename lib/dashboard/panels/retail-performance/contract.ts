/**
 * executable: false
 * containsVerticalComplianceLogic: false
 * subSpec: docs/retail/wave2/sub-specs/RTL_K_F_Panel_Contract_Spec.md
 *
 * Shape-only panel field contract for Retail Performance.
 * No runtime functions. KPI math lives in RTL-K-G evaluator modules.
 */

import type {
  RetailPanelContext,
  RetailSubSegment,
} from "../../../intelligence/synthetic/industry/contracts/retail/RetailBasisContracts";
import type { ReportingBasis } from "../../../intelligence/synthetic/standards/contracts/ReportingBasis";

/** Higher-better / lower-better / target-band per Retail_KPIs_Sources.md sign tags. */
export type RetailKpiSignConvention = "higher-better" | "lower-better" | "target-band";

export interface RetailKpiValue {
  amount: number;
  unitOfMeasure: "%" | "USD" | "ratio" | "count" | "USD_per_sqft" | string;
  signConvention: RetailKpiSignConvention;
}

export interface RetailKpiField {
  id: string;
  label: string;
  value: RetailKpiValue;
  basisOfStandards: string;
  applicableSubSegments: RetailSubSegment[];
}

/** Dollar forecast variance - F/U only in forecast section optional fields. */
export type RetailForecastSignTag = "F" | "U";

export interface RetailSignedDollarDelta {
  amountUsd: number;
  signTag: RetailForecastSignTag;
}

export interface RetailPerformancePanelReadParams {
  companyId: string;
  accountingPeriod: string;
  context: RetailPanelContext;
}

export type RetailForecastInputSource =
  | "demand-forecast"
  | "open-to-buy"
  | "merchandise-plan"
  | "sop"
  | string;

export interface RetailForecastVarianceSection {
  forecastHorizon: { periodsAhead: number };
  forecastInputSource: RetailForecastInputSource;

  /** RTL-FV-01 */
  sameStoreSalesGrowth: RetailKpiField;
  /** RTL-FV-02 */
  trafficCount: RetailKpiField;
  /** RTL-FV-03 */
  conversionRate: RetailKpiField;
  /** RTL-FV-04 */
  averageOrderValue: RetailKpiField;
  /** RTL-FV-05 */
  unitsPerTransaction: RetailKpiField;
  /** RTL-FV-06 */
  grossMarginPercent: RetailKpiField;
  /** RTL-FV-07 */
  grossMarginROI: RetailKpiField;
  /** RTL-FV-08 */
  inventoryTurnover: RetailKpiField;
  /** RTL-FV-09 */
  sellThroughRate: RetailKpiField;
  /** RTL-FV-10 */
  shrinkRate: RetailKpiField;
  /** RTL-FV-11 */
  returnsRate: RetailKpiField;
  /** RTL-FV-12 */
  attachRate?: RetailKpiField;
  /** RTL-FV-13 */
  salesPerSquareFoot: RetailKpiField;
  /** RTL-FV-14 */
  onlineSessions: RetailKpiField;
  /** RTL-FV-15 */
  cartAbandonmentRate: RetailKpiField;
  /** RTL-FV-16 */
  digitalCAC: RetailKpiField;
}

export interface RetailPerformancePanelContract {
  companyId: string;
  accountingPeriod: string;
  context: RetailPanelContext;
  reportingBasis: ReportingBasis;
  netSalesForPeriod: number;
  unitOfMeasure: "USD";
  comparableStoreCount: number;
  fiscalCalendar: RetailPanelContext["fiscalCalendar"];

  /** RTL-K-01 */
  sameStoreSalesGrowth: RetailKpiField;
  /** RTL-K-02 */
  trafficCount: RetailKpiField;
  /** RTL-K-03 */
  conversionRate: RetailKpiField;
  /** RTL-K-04 */
  averageOrderValue: RetailKpiField;
  /** RTL-K-05 */
  unitsPerTransaction: RetailKpiField;
  /** RTL-K-06 */
  grossMarginPercent: RetailKpiField;
  /** RTL-K-07 */
  grossMarginROI: RetailKpiField;
  /** RTL-K-08 */
  inventoryTurnover: RetailKpiField;
  /** RTL-K-09 */
  sellThroughRate: RetailKpiField;
  /** RTL-K-10 */
  shrinkRate: RetailKpiField;
  /** RTL-K-11 */
  returnsRate: RetailKpiField;
  /** RTL-K-12 */
  attachRate?: RetailKpiField;
  /** RTL-K-13 */
  salesPerSquareFoot: RetailKpiField;
  /** RTL-K-14 */
  onlineSessions: RetailKpiField;
  /** RTL-K-15 */
  cartAbandonmentRate: RetailKpiField;
  /** RTL-K-16 */
  digitalCAC: RetailKpiField;

  forecastVarianceSection?: RetailForecastVarianceSection;
}
