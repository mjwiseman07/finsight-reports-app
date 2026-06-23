/**
 * executable: false
 * containsVerticalComplianceLogic: false
 * subSpec: docs/manufacturing/wave2/MFG_K_F_Panel_Field_Contract_Spec.md
 *
 * Shape-only panel field contract for Manufacturing Variances.
 * No runtime functions. Variance math lives in MFG-K-G evaluator.
 */

import type {
  ManufacturingPanelContext,
  ManufacturingSubSegment,
} from "../../../intelligence/synthetic/industry/contracts/manufacturing/ManufacturingBasisContracts";
import type { ReportingBasis } from "../../../intelligence/synthetic/standards/contracts/ReportingBasis";

export type ManufacturingStandardsBasis = "budgeted" | "engineered" | "historical-rolling";

export type ManufacturingVarianceSignTag = "F" | "U";

export type ManufacturingForecastInputSource = "sop" | "demand-forecast" | "sales-pipeline" | string;

/**
 * F = favorable NEGATIVE; U = unfavorable POSITIVE (IMA/AICPA convention).
 * Invariant: signTag MUST agree with sign of amountUsd.
 * Zero-value: { amountUsd: 0, signTag: 'F' }.
 */
export interface ManufacturingSignedDollarVariance {
  amountUsd: number;
  signTag: ManufacturingVarianceSignTag;
}

export interface ManufacturingVarianceField {
  id: string;
  label: string;
  value: ManufacturingSignedDollarVariance;
  basisOfStandards: string;
  unitOfMeasure: string;
  applicableSubSegments: ManufacturingSubSegment[];
}

export interface ManufacturingVariancePanelReadParams {
  companyId: string;
  accountingPeriod: string;
  context: ManufacturingPanelContext;
}

export interface ManufacturingForecastVarianceSection {
  forecastHorizon: { periodsAhead: number };
  forecastInputSource: ManufacturingForecastInputSource;
  /** MFG-FV-01 — F = favorable NEGATIVE; U = unfavorable POSITIVE */
  directMaterialsPriceVariance: ManufacturingVarianceField;
  /** MFG-FV-02 */
  directMaterialsUsageVariance: ManufacturingVarianceField;
  /** MFG-FV-03 */
  directLaborRateVariance: ManufacturingVarianceField;
  /** MFG-FV-04 */
  directLaborEfficiencyVariance: ManufacturingVarianceField;
  /** MFG-FV-05 */
  variableOverheadSpendingVariance: ManufacturingVarianceField;
  /** MFG-FV-06 */
  variableOverheadEfficiencyVariance: ManufacturingVarianceField;
  /** MFG-FV-07a */
  fixedOverheadSpendingVariance: ManufacturingVarianceField;
  /** MFG-FV-07b */
  fixedOverheadVolumeVariance: ManufacturingVarianceField;
  /** MFG-FV-08 */
  totalManufacturingCostForecastVariance: ManufacturingVarianceField;
}

export interface ManufacturingVariancePanelContract {
  companyId: string;
  accountingPeriod: string;
  context: ManufacturingPanelContext;

  /** MFG-V-01 — F = favorable NEGATIVE; U = unfavorable POSITIVE */
  directMaterialsPriceVariance: ManufacturingVarianceField;
  /** MFG-V-02 */
  directMaterialsUsageVariance: ManufacturingVarianceField;
  /** MFG-V-03 */
  directLaborRateVariance: ManufacturingVarianceField;
  /** MFG-V-04 */
  directLaborEfficiencyVariance: ManufacturingVarianceField;
  /** MFG-V-05 */
  variableOverheadSpendingVariance: ManufacturingVarianceField;
  /** MFG-V-06 */
  variableOverheadEfficiencyVariance: ManufacturingVarianceField;
  /** MFG-V-07a */
  fixedOverheadSpendingVariance: ManufacturingVarianceField;
  /** MFG-V-07b */
  fixedOverheadVolumeVariance: ManufacturingVarianceField;
  /** MFG-V-08 */
  totalManufacturingCostVariance: ManufacturingVarianceField;

  /** MFG-V-09 — P/H sub-segments only (optional) */
  directMaterialsMixVariance?: ManufacturingVarianceField;
  /** MFG-V-10 — P/H sub-segments only (optional) */
  directMaterialsYieldVariance?: ManufacturingVarianceField;

  standardsBasis: ManufacturingStandardsBasis;
  productionVolumeForPeriod: number;
  unitOfMeasure: string;
  reportingBasis: ReportingBasis;

  forecastVarianceSection?: ManufacturingForecastVarianceSection;
}
