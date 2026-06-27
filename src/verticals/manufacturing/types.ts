export type ReportingBasis = "US_GAAP" | "IFRS";

export type ManufacturingCostingMethod = "Standard" | "Actual" | "Process" | "JobOrder";

export type InventoryEvaluationGranularity = "ITEM" | "GROUPED";

export interface USGAAPInventory {
  basis: "US_GAAP";
  method: "FIFO" | "LIFO" | "WeightedAverage" | "SpecificID";
  lifoReserve?: number;
  obsolescenceReserve?: number;
  lcnrvApplies: boolean;
  lcmApplies: boolean;
  writeDownPermanent: true;
  itemByItemOrGrouped: InventoryEvaluationGranularity;
}

export interface IFRSInventory {
  basis: "IFRS";
  method: "FIFO" | "WeightedAverage" | "SpecificID";
  obsolescenceReserve?: number;
  nrvWriteUpReversalPermitted: true;
  nrvEvaluationGranularity: InventoryEvaluationGranularity;
}

export type Inventory = USGAAPInventory | IFRSInventory;

export interface LifoReserveDisclosure {
  basis: "US_GAAP";
  reserveAmount: number;
  liquidationIncomeRecognized?: number;
  replacementCostDisclosed?: number;
  asOfDate: Date;
}

export interface USGAAPLease {
  basis: "US_GAAP";
  classification: "OPERATING" | "FINANCE";
  rouAsset: number;
  leaseLiability: number;
  expensePattern: "STRAIGHT_LINE" | "INTEREST_PLUS_AMORTIZATION";
  shortTermExpedientElected: boolean;
}

export interface IFRSLease {
  basis: "IFRS";
  rouAsset: number;
  leaseLiability: number;
  expensePattern: "INTEREST_PLUS_AMORTIZATION";
  shortTermExpedientElected: boolean;
  lowValueExpedientElected: boolean;
}

export type Lease = USGAAPLease | IFRSLease;

export interface USGAAPPpe {
  basis: "US_GAAP";
  costModel: "HISTORICAL_COST";
  componentized: boolean;
  revaluationSurplus: never;
}

export interface IFRSPpe {
  basis: "IFRS";
  costModel: "HISTORICAL_COST" | "REVALUATION";
  componentized: true;
  componentMinThresholdPct: number;
  revaluationSurplus?: number;
  revaluationFrequency?: "ANNUAL" | "TRIENNIAL" | "AD_HOC";
}

export type Ppe = USGAAPPpe | IFRSPpe;

export interface USGAAPRevenueContract {
  basis: "US_GAAP";
  framework: "ASC_606";
  recognitionPattern: "POINT_IN_TIME" | "OVER_TIME";
  seriesGuidanceApplied?: boolean;
  contractMfgDefault?: "SERIES_GUIDANCE_ON" | "SERIES_GUIDANCE_OFF";
}

export interface IFRSRevenueContract {
  basis: "IFRS";
  framework: "IFRS_15";
  recognitionPattern: "POINT_IN_TIME" | "OVER_TIME";
  seriesGuidanceApplied?: boolean;
}

export type RevenueContract = USGAAPRevenueContract | IFRSRevenueContract;

export interface USGAAPDisclosurePackage {
  basis: "US_GAAP";
  regSkItems: Array<"101" | "103" | "105" | "301" | "303">;
  item101SegmentDisclosureBinding: boolean;
  lifoReserveDisclosed: boolean;
  conflictMineralsFormSdRequired: boolean;
  conflictMineralsDeMinimisPct: number;
  rcoiInquiryDepth: "STANDARD" | "EXTENDED";
  climateRuleStatus?: "SEC_FINAL_RULE_2024" | "STAYED" | "NOT_APPLICABLE";
}

export interface IFRSDisclosurePackage {
  basis: "IFRS";
  ias2CostFormulaDisclosed: boolean;
  ifrs16MaturityAnalysisDisclosed: boolean;
}

export type DisclosurePackage = USGAAPDisclosurePackage | IFRSDisclosurePackage;

export interface SixVariance {
  ppv: number;
  muv: number;
  lrv: number;
  lev: number;
  osv: number;
  ovv: number;
  overheadMethod: "TWO_VARIANCE" | "FOUR_VARIANCE";
  mixVariance?: number;
  yieldVariance?: number;
  mixYieldReportingThresholdPct: number;
}

export type ManufacturingSubSegment = "D" | "P" | "H" | "J" | "E";

export interface SubSegmentDeclaration {
  primary: ManufacturingSubSegment;
  hybridSecondary?: ManufacturingSubSegment;
  hybridDeclarationLocked: boolean;
}

export type MfgKvRow =
  | "D-discrete"
  | "P-process"
  | "H-hybrid"
  | "J-job-shop"
  | "E-engineering-to-order"
  | "GAAP-LIFO"
  | "GAAP-FIFO"
  | "IFRS-FIFO"
  | "IFRS-Revalued"
  | "MultiEntity-Mixed"
  | "ContractMfg";

export type MfgBaseKvColumn =
  | "revenue-recognition"
  | "journal-entry-prep"
  | "reconciliation"
  | "variance-analysis"
  | "close-management"
  | "financial-statements"
  | "audit-support"
  | "fund-accounting-audit"
  | "dcaa-audit"
  | "construction-contract-audit"
  | "restricted-net-asset-audit";

export type MfgKvColumn = MfgBaseKvColumn | "manufacturing-cost-audit";

export interface MfgEntityContext {
  row: MfgKvRow;
  basis: ReportingBasis;
  containsRestrictedNetAssetData: boolean;
}
