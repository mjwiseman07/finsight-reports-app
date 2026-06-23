import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";

/**
 * Panel read context for manufacturing variance surfaces.
 *
 * Wave 2: company-level binding only — entityId is always undefined;
 * naicsCode is optional/nullable until Wave 3 entity schema lands.
 *
 * Wave 3 migration MUST preserve this interface shape when adding
 * tenant→entity→NAICS persistence. Do not rename or remove fields.
 */
export interface ManufacturingPanelContext {
  companyId: string;
  entityId?: string; // Wave 3 hook; always undefined in Wave 2
  reportingBasis: ReportingBasis;
  subSegment: "D" | "P" | "H" | "J" | "E";
  naicsCode?: string; // Wave 3 hook; nullable in Wave 2
}

export type ManufacturingSubSegment = ManufacturingPanelContext["subSegment"];

export type USGAAPInventoryMethod = "FIFO" | "LIFO" | "WeightedAverage" | "SpecificID";
export type IFRSInventoryMethod = "FIFO" | "WeightedAverage";

export interface USGAAPInventory {
  basis: "US_GAAP";
  method: USGAAPInventoryMethod;
  lifoReserve?: number; // only when method === 'LIFO'
}

export interface IFRSInventory {
  basis: "IFRS";
  method: IFRSInventoryMethod;
}

export type Inventory = USGAAPInventory | IFRSInventory;

export interface USGAAPLease {
  basis: "US_GAAP";
  classification: "operating" | "finance";
  rouAsset?: number;
  leaseLiability?: number;
}

export interface IFRSLease {
  basis: "IFRS";
  model: "ifrs16_single_model";
  rouAsset: number;
  leaseLiability: number;
}

export type Lease = USGAAPLease | IFRSLease;

export interface USGAAP_PPE {
  basis: "US_GAAP";
  measurement: "historical_cost";
  componentized: boolean;
}

export interface IFRS_PPE {
  basis: "IFRS";
  measurement: "cost" | "revaluation";
  componentized: true;
  revaluationSurplus?: number;
}

export type PPE = USGAAP_PPE | IFRS_PPE;

export type RevenueRecognitionPattern = "point_in_time" | "over_time";

export interface USGAAPRevenueContract {
  basis: "US_GAAP";
  standard: "ASC606";
  recognitionPattern: RevenueRecognitionPattern;
}

export interface IFRSRevenueContract {
  basis: "IFRS";
  standard: "IFRS15";
  recognitionPattern: RevenueRecognitionPattern;
}

export type RevenueContract = USGAAPRevenueContract | IFRSRevenueContract;

export type USGAAPDisclosureRegime = "ASC330" | "ASC842" | "RegSK";
export type IFRSDisclosureRegime = "IAS2" | "IAS16" | "IFRS15" | "IFRS16";

export interface USGAAPDisclosurePackage {
  basis: "US_GAAP";
  regimes: USGAAPDisclosureRegime[];
  lifoReserveDisclosureRequired: boolean;
}

export interface IFRSDisclosurePackage {
  basis: "IFRS";
  regimes: IFRSDisclosureRegime[];
  lifoReserveDisclosureRequired: false;
}

export type DisclosurePackage = USGAAPDisclosurePackage | IFRSDisclosurePackage;
