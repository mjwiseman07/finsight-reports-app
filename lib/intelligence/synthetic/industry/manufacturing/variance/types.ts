import type {
  ManufacturingForecastInputSource,
  ManufacturingStandardsBasis,
  ManufacturingVariancePanelContract,
} from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type {
  IFRSInventory,
  ManufacturingPanelContext,
  USGAAPInventory,
} from "../../contracts/manufacturing/ManufacturingBasisContracts";
import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";

export type ManufacturingEvaluatorError =
  | "MISSING_STANDARD_COST"
  | "MISSING_ACTUAL_RESULT"
  | "NEGATIVE_PRODUCTION_VOLUME"
  | "SUB_SEGMENT_MIX_YIELD_UNAVAILABLE"
  | "IFRS_LIFO_INPUT_REJECTED"
  | "BASIS_MISMATCH";

export type ManufacturingEvaluatorResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ManufacturingEvaluatorError };

export interface MixComponentInput {
  actualInputQuantity: number;
  standardMixProportion: number;
  standardPrice: number;
}

export interface DirectMaterialsCostInputs {
  standardPrice: number;
  actualPrice: number;
  actualQuantityPurchased: number;
  standardQuantityAllowed: number;
  actualQuantityUsed: number;
  mixComponents?: MixComponentInput[];
  actualTotalInput?: number;
  standardTotalInputForOutput?: number;
  standardWeightedAverageInputPrice?: number;
}

export interface DirectLaborCostInputs {
  standardRate: number;
  actualRate: number;
  actualHoursWorked: number;
  standardHoursAllowed: number;
}

export interface VariableOverheadCostInputs {
  standardVohRate: number;
  actualVohRate: number;
  actualHours: number;
  standardHoursAllowed: number;
}

export interface FixedOverheadCostInputs {
  budgetedFixedOverhead: number;
  actualFixedOverhead: number;
  standardFohRate: number;
  standardHoursAllowed: number;
}

export interface ManufacturingForecastCostInputs {
  forecastHorizon: { periodsAhead: number };
  forecastInputSource: ManufacturingForecastInputSource;
  directMaterials: DirectMaterialsCostInputs;
  directLabor: DirectLaborCostInputs;
  variableOverhead: VariableOverheadCostInputs;
  fixedOverhead: FixedOverheadCostInputs;
}

interface ManufacturingEvaluatorInputsBase {
  companyId: string;
  accountingPeriod: string;
  context: ManufacturingPanelContext;
  standardsBasis: ManufacturingStandardsBasis;
  productionVolumeForPeriod: number;
  unitOfMeasure: string;
  directMaterials: DirectMaterialsCostInputs;
  directLabor: DirectLaborCostInputs;
  variableOverhead: VariableOverheadCostInputs;
  fixedOverhead: FixedOverheadCostInputs;
  forecast?: ManufacturingForecastCostInputs;
}

export interface USGAAPManufacturingEvaluatorInputs extends ManufacturingEvaluatorInputsBase {
  reportingBasis: "US_GAAP";
  inventory: USGAAPInventory;
}

export interface IFRSManufacturingEvaluatorInputs extends ManufacturingEvaluatorInputsBase {
  reportingBasis: "IFRS";
  inventory: IFRSInventory;
  /** Recast non-LIFO standard price per IFRS Sources Part V section 5.3 */
  ifrsRecastStandardPrice: number;
}

export type ManufacturingEvaluatorInputs =
  | USGAAPManufacturingEvaluatorInputs
  | IFRSManufacturingEvaluatorInputs;

export type ManufacturingEvaluatorOutput = ManufacturingVariancePanelContract;
