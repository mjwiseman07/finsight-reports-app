import type { ReportingBasis } from "../manufacturing/types";

export type { ReportingBasis };

export type FiscalCalendar = "4_5_4_NRF" | "GREGORIAN_CALENDAR" | "52_53_WEEK_RETAIL";

export interface FiscalCalendarPolicy {
  calendar: FiscalCalendar;
  exclude53rdWeekFromCompStore: boolean;
}

export type RetailSubSegment = "B" | "E" | "O" | "G" | "S";

export interface SubSegmentDeclaration {
  primary: RetailSubSegment;
  secondary?: RetailSubSegment;
  lockedAtFirstClose: boolean;
}

export interface USGAAPRetailInventory {
  basis: "US_GAAP";
  method: "FIFO" | "LIFO" | "WeightedAverage" | "SpecificID" | "RIM";
  lifoReserve?: number;
  rimCostComplement?: number;
  rimMarkupPercent?: number;
  rimMarkdownPercent?: number;
  lcnrvApplies: boolean;
  lcmApplies: boolean;
  perishableShrinkReserve?: number;
  markdownReserve?: number;
  writeDownPermanent: true;
}

export interface IFRSRetailInventory {
  basis: "IFRS";
  method: "FIFO" | "WeightedAverage" | "SpecificID";
  perishableShrinkReserve?: number;
  markdownReserve?: number;
  nrvWriteUpReversalPermitted: true;
}

export type RetailInventory = USGAAPRetailInventory | IFRSRetailInventory;

export type GiftCardBreakageMethodology = "PROPORTIONAL" | "REMOTE";

export interface GiftCardLiability {
  outstandingBalance: number;
  breakageMethodology: GiftCardBreakageMethodology;
  breakageRecognized: number;
  escheatmentJurisdictionDeferred: true;
  redemptionPatternHistoryMonths: number;
}

export type LoyaltySspAllocation = "RELATIVE_SSP" | "RESIDUAL";

export interface LoyaltyMaterialRight {
  programId: string;
  deferredRevenue: number;
  pointsOutstanding: number;
  standaloneSellingPricePerPoint: number;
  breakageRate: number;
  redemptionWindowMonths: number;
  sspAllocation: LoyaltySspAllocation;
}

export type ReturnsReserveBasis = "HISTORICAL" | "ROLLING_AVERAGE_12_MONTH" | "FORECAST_ADJUSTED";
export type ReturnsReserveCadence = "MONTHLY" | "QUARTERLY" | "ANNUALLY";

export interface ReturnsReserve {
  estimatedReturnsRate: number;
  refundLiability: number;
  returnAssetGross: number;
  returnAssetImpairment?: number;
  reserveBasis: ReturnsReserveBasis;
  refreshCadence: ReturnsReserveCadence;
}

export interface ConsignmentArrangement {
  controlTransferred: boolean;
  consigneeReturnRights: boolean;
  consignorPricingControl: boolean;
}

export type PrincipalAgentRole = "PRINCIPAL" | "AGENT";

export interface PrincipalAgentDetermination {
  role: PrincipalAgentRole;
  controlOfSpecifiedGoodService: boolean;
  primaryResponsibilityForFulfillment: boolean;
  inventoryRisk: boolean;
  pricingDiscretion: boolean;
  threeFactorThreshold: 2;
}

export interface IFRSStoreCgu {
  basis: "IFRS";
  cguId: string;
  carryingAmount: number;
  recoverableAmount: number;
  impairmentLoss?: number;
  reversalPermitted: true;
}

export type RetailImpairmentTrigger =
  | "TRAFFIC_DECLINE"
  | "COMP_SALES_DECLINE"
  | "LEASE_EXPIRY"
  | "STORE_CLOSURE_DECISION"
  | "OTHER";

export interface USGAAPRetailImpairmentTrigger {
  basis: "US_GAAP";
  storeAssetGroupId: string;
  triggerEvent: RetailImpairmentTrigger;
  undiscountedCashFlows: number;
  carryingAmount: number;
  impairmentRecognized?: number;
  reversalPermitted: false;
}

export type StoreImpairment = IFRSStoreCgu | USGAAPRetailImpairmentTrigger;

export interface USGAAPRetailLease {
  basis: "US_GAAP";
  classification: "OPERATING" | "FINANCE";
  rouAsset: number;
  leaseLiability: number;
  percentageRentTerms?: { thresholdSales: number; ratePct: number };
  variableLeasePaymentNonRoUFlow: number;
  shortTermExpedientElected: boolean;
}

export interface IFRSRetailLease {
  basis: "IFRS";
  rouAsset: number;
  leaseLiability: number;
  variableLeasePaymentNonRoUFlow: number;
  retailTenantGrossUpApplied: boolean;
  shortTermExpedientElected: boolean;
  lowValueExpedientElected: boolean;
}

export type RetailLease = USGAAPRetailLease | IFRSRetailLease;

export type CompStoreRule = "NRF_13_MONTH" | "FOUNDER_DEFINED_MONTHS";

export interface ComparableStorePolicy {
  rule: CompStoreRule;
  founderMonths?: number;
  excludeRemodelsMonths?: number;
  excludePermanentClosures: boolean;
}

export interface RetailPanelContext {
  companyId: string;
  entityId: string;
  reportingBasis: ReportingBasis;
  subSegment: SubSegmentDeclaration;
  fiscalCalendarPolicy: FiscalCalendarPolicy;
  comparableStorePolicy: ComparableStorePolicy;
  naicsCode: string;
  netSalesForPeriod: number;
  unitOfMeasure: "USD";
  containsRestrictedNetAssetData: false;
}

export const RETAIL_DEFAULTS = {
  fiscalCalendar: "4_5_4_NRF" as const,
  exclude53rdWeekFromCompStore: true,
  giftCardBreakageMethodology: "PROPORTIONAL" as const,
  giftCardMinHistoryMonths: 24,
  loyaltyBreakageRate: 0.15,
  loyaltySspAllocation: "RELATIVE_SSP" as const,
  returnsReserveBasis: "ROLLING_AVERAGE_12_MONTH" as const,
  returnsReserveCadence: "QUARTERLY" as const,
  principalAgentThreshold: 2 as const,
  marketplaceAgentRole: "AGENT" as const,
  retailTenantGrossUpApplied: true,
  compStoreRule: "NRF_13_MONTH" as const,
  subSegmentLockAtFirstClose: true,
};
