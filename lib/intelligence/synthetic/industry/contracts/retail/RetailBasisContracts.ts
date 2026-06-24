import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";
import type {
  IFRSDisclosurePackage,
  IFRSInventory,
  IFRSLease,
  IFRS_PPE,
  USGAAPDisclosurePackage,
  USGAAPInventory,
  USGAAPLease,
  USGAAPRevenueContract,
  USGAAP_PPE,
  IFRSRevenueContract,
} from "../manufacturing/ManufacturingBasisContracts";

/**
 * Panel read context for retail performance surfaces.
 *
 * Wave 2: company-level binding only - entityId is always undefined;
 * naicsCode is optional/nullable until Wave 3 entity schema lands.
 *
 * Wave 3 migration MUST preserve this interface shape when adding
 * tenant->entity->NAICS persistence. Do not rename or remove fields.
 */
export type RetailSubSegment = "B" | "E" | "O" | "G" | "S";

/** NRF 4-5-4 retail fiscal calendar vs ISO calendar-month boundaries. */
export type RetailFiscalCalendar = "4-5-4" | "calendar";

/** Comparable-store policy - NRF 13-month default per planning Q1. */
export type ComparableStorePolicy = "NRF_13_MONTH" | "FOUNDER_DEFINED";

export interface RetailPanelContext {
  companyId: string;
  entityId?: string;
  reportingBasis: ReportingBasis;
  /** Alias of reportingBasis exposed at CC surface contract per PC-26. */
  applicableBasis: ReportingBasis;
  subSegment: RetailSubSegment;
  naicsCode?: string;
  fiscalCalendar: RetailFiscalCalendar;
  comparableStorePolicy: ComparableStorePolicy;
}

export type USGAAPInventoryMethod =
  | "FIFO"
  | "LIFO"
  | "WeightedAverage"
  | "SpecificID"
  | "RIM"
  | "RIM_LIFO";

export interface USGAAPRIMInventory {
  basis: "US_GAAP";
  method: "RIM" | "RIM_LIFO";
  /** Present only when method === 'RIM_LIFO'. Absent on IFRS branch. */
  lifoReserve?: number;
  /** RIM compares to market (LCM), not pure NRV - ASC 330-10-30-13. */
  measurementBase: "lower_of_cost_or_market";
}

/** IFRS branch: reuse IFRSInventory from ManufacturingBasisContracts. */
export type RetailIFRSInventory = IFRSInventory & {
  /** IAS 2.22 retail method permitted as cost-approximation technique only. */
  retailMethodPermitted: true;
};

export type BreakageMode = "EXPECTED_PROPORTIONAL" | "NOT_EXPECTED_REMOTE";

/** US-only escheat overlay - absent from IFRS branch. */
export interface StateEscheatRule {
  jurisdictionCode: string;
  /** Breakage recognized must be net of expected escheat - ASC 606-10-55-49. */
  expectedEscheatPortion: number;
}

export interface USGAAPGiftCardLiability {
  basis: "US_GAAP";
  standard: "ASC606";
  breakageMode: BreakageMode;
  escheatOverlay?: StateEscheatRule;
}

export interface IFRSGiftCardLiability {
  basis: "IFRS";
  standard: "IFRS15";
  breakageMode: BreakageMode;
}

export type GiftCardLiability = USGAAPGiftCardLiability | IFRSGiftCardLiability;

export type LoyaltyOptionType =
  | "POINTS"
  | "TIER_STATUS"
  | "PAID_MEMBERSHIP"
  | "CASHBACK"
  | "PARTNER";

export type StandaloneSellingPriceMethod =
  | "ADJ_MARKET"
  | "EXPECTED_COST_PLUS"
  | "RESIDUAL";

export interface LoyaltyMaterialRightCore {
  optionType: LoyaltyOptionType;
  sspMethod: StandaloneSellingPriceMethod;
}

export interface USGAAPMaterialRight extends LoyaltyMaterialRightCore {
  basis: "US_GAAP";
  standard: "ASC606";
}

export interface IFRSMaterialRight extends LoyaltyMaterialRightCore {
  basis: "IFRS";
  standard: "IFRS15";
}

export type LoyaltyMaterialRight = USGAAPMaterialRight | IFRSMaterialRight;

export type ReturnsChannel = "ECOM" | "BRICK" | "SUBSCRIPTION";

export interface USGAAPRefundLiability {
  basis: "US_GAAP";
  standard: "ASC606";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export interface USGAAPReturnAsset {
  basis: "US_GAAP";
  standard: "ASC606";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export interface IFRSRefundLiability {
  basis: "IFRS";
  standard: "IFRS15";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export interface IFRSReturnAsset {
  basis: "IFRS";
  standard: "IFRS15";
  channel: ReturnsChannel;
  presentation: "GROSS";
}

export type ReturnsReserveUSGAAP = {
  refundLiability: USGAAPRefundLiability;
  returnAsset: USGAAPReturnAsset;
};

export type ReturnsReserveIFRS = {
  refundLiability: IFRSRefundLiability;
  returnAsset: IFRSReturnAsset;
};

export type StoreCguScope = "store" | "store_cluster";

export interface ASC360StoreImpairment {
  basis: "US_GAAP";
  standard: "ASC360";
  cguScope: StoreCguScope;
  triggerModel: "undiscounted_cash_flow_held_and_used";
  reversalPermitted: false;
}

export interface IFRSStoreCGU {
  basis: "IFRS";
  standard: "IAS36";
  cguScope: StoreCguScope;
  recoverableAmount: "higher_of_fvlcd_and_viu";
  /** IAS 36.124 - reversal permitted for store CGU, never for goodwill. */
  reversalPermitted: true;
  goodwillReversalPermitted: false;
}

export type StoreImpairmentRouting = ASC360StoreImpairment | IFRSStoreCGU;

export type PeriodBoundaryKind = "NRF_454_WEEK" | "ISO_CALENDAR_MONTH";

export interface RetailPeriodBoundary {
  fiscalCalendar: RetailFiscalCalendar;
  boundaryKind: PeriodBoundaryKind;
  /** ISO-8601 period start inclusive */
  periodStart: string;
  /** ISO-8601 period end inclusive */
  periodEnd: string;
}

export interface ComparableStorePeriodPair {
  current: RetailPeriodBoundary;
  prior: RetailPeriodBoundary;
  /** Both periods MUST share boundaryKind. */
  boundaryMatch: true;
}

export interface USGAAPConsignmentControl {
  basis: "US_GAAP";
  role: "CONSIGNOR" | "CONSIGNEE";
  controlRetained: boolean;
}

export interface IFRSConsignmentControl {
  basis: "IFRS";
  role: "CONSIGNOR" | "CONSIGNEE";
  controlRetained: boolean;
}

export interface USGAAPPrincipalAgent {
  basis: "US_GAAP";
  role: "PRINCIPAL" | "AGENT";
  grossOrNet: "GROSS" | "NET";
  threeFactor: {
    fulfillment: boolean;
    inventoryRisk: boolean;
    priceDiscretion: boolean;
  };
}

export interface IFRSPrincipalAgent {
  basis: "IFRS";
  role: "PRINCIPAL" | "AGENT";
  grossOrNet: "GROSS" | "NET";
  threeFactor: {
    fulfillment: boolean;
    inventoryRisk: boolean;
    priceDiscretion: boolean;
  };
}

export type RetailInventory = USGAAPInventory | RetailIFRSInventory | USGAAPRIMInventory;
export type RetailLease = USGAAPLease | IFRSLease;
export type RetailPPE = USGAAP_PPE | IFRS_PPE;
export type RetailRevenueContract = USGAAPRevenueContract | IFRSRevenueContract;
export type RetailDisclosurePackage = USGAAPDisclosurePackage | IFRSDisclosurePackage;

export declare function assertBasisRoute<T extends { basis: ReportingBasis }>(
  value: T,
  expected: ReportingBasis,
): T;

export declare function routeStoreImpairment(reportingBasis: ReportingBasis): StoreImpairmentRouting;

export declare function resolvePeriodBoundaryKind(
  fiscalCalendar: RetailFiscalCalendar,
): PeriodBoundaryKind;

export declare function assertComparableStoreBoundaryMatch(pair: ComparableStorePeriodPair): void;
