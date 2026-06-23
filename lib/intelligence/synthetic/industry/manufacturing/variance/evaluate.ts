import type {
  ManufacturingForecastVarianceSection,
  ManufacturingVariancePanelContract,
} from "../../../../../dashboard/panels/manufacturing-variance/contract";
import { evaluateDirectMaterials, priceVariance as forecastDmPrice, usageVariance as forecastDmUsage } from "./directMaterials";
import { evaluateDirectLabor, efficiencyVariance as forecastDlEfficiency, rateVariance as forecastDlRate } from "./directLabor";
import { evaluateFixedOverhead, spendingVariance as forecastFohSpending, volumeVariance as forecastFohVolume } from "./fixedOverhead";
import { assertReportingBasisConsistency, resolveStandardMaterialPrice } from "./ifrsRecast";
import { totalManufacturingCost, totalManufacturingCostForecast } from "./totalManufacturingCost";
import type { ManufacturingEvaluatorInputs, ManufacturingEvaluatorResult } from "./types";
import { evaluateVariableOverhead, efficiencyVariance as forecastVohEfficiency, spendingVariance as forecastVohSpending } from "./variableOverhead";

function buildForecastSection(
  inputs: ManufacturingEvaluatorInputs,
): ManufacturingEvaluatorResult<ManufacturingForecastVarianceSection> {
  if (!inputs.forecast) {
    return { ok: false, error: "MISSING_ACTUAL_RESULT" };
  }

  const forecastInputs = {
    ...inputs,
    directMaterials: inputs.forecast.directMaterials,
    directLabor: inputs.forecast.directLabor,
    variableOverhead: inputs.forecast.variableOverhead,
    fixedOverhead: inputs.forecast.fixedOverhead,
  };

  const standardPriceResult = resolveStandardMaterialPrice(forecastInputs);
  if (!standardPriceResult.ok) return standardPriceResult;

  const fv01 = forecastDmPrice(inputs.forecast.directMaterials, standardPriceResult.value, inputs.unitOfMeasure);
  if (!fv01.ok) return fv01;
  const fv01Field = { ...fv01.value, id: "MFG-FV-01", label: "Forecast Direct Materials Price Variance" };

  const fv02 = forecastDmUsage(inputs.forecast.directMaterials, standardPriceResult.value, inputs.unitOfMeasure);
  if (!fv02.ok) return fv02;
  const fv02Field = { ...fv02.value, id: "MFG-FV-02", label: "Forecast Direct Materials Usage Variance" };

  const fv03 = forecastDlRate(inputs.forecast.directLabor, inputs.unitOfMeasure);
  if (!fv03.ok) return fv03;
  const fv03Field = { ...fv03.value, id: "MFG-FV-03", label: "Forecast Direct Labor Rate Variance" };

  const fv04 = forecastDlEfficiency(inputs.forecast.directLabor, inputs.unitOfMeasure);
  if (!fv04.ok) return fv04;
  const fv04Field = { ...fv04.value, id: "MFG-FV-04", label: "Forecast Direct Labor Efficiency Variance" };

  const fv05 = forecastVohSpending(inputs.forecast.variableOverhead, inputs.unitOfMeasure);
  if (!fv05.ok) return fv05;
  const fv05Field = { ...fv05.value, id: "MFG-FV-05", label: "Forecast Variable Overhead Spending Variance" };

  const fv06 = forecastVohEfficiency(inputs.forecast.variableOverhead, inputs.unitOfMeasure);
  if (!fv06.ok) return fv06;
  const fv06Field = { ...fv06.value, id: "MFG-FV-06", label: "Forecast Variable Overhead Efficiency Variance" };

  const fv07a = forecastFohSpending(inputs.forecast.fixedOverhead, inputs.unitOfMeasure);
  if (!fv07a.ok) return fv07a;
  const fv07aField = { ...fv07a.value, id: "MFG-FV-07a", label: "Forecast Fixed Overhead Spending Variance" };

  const fv07b = forecastFohVolume(inputs.forecast.fixedOverhead, inputs.unitOfMeasure);
  if (!fv07b.ok) return fv07b;
  const fv07bField = { ...fv07b.value, id: "MFG-FV-07b", label: "Forecast Fixed Overhead Volume Variance" };

  const fv08 = totalManufacturingCostForecast(
    [fv01Field, fv02Field, fv03Field, fv04Field, fv05Field, fv06Field, fv07aField, fv07bField],
    inputs.unitOfMeasure,
  );
  if (!fv08.ok) return fv08;

  return {
    ok: true,
    value: {
      forecastHorizon: inputs.forecast.forecastHorizon,
      forecastInputSource: inputs.forecast.forecastInputSource,
      directMaterialsPriceVariance: fv01Field,
      directMaterialsUsageVariance: fv02Field,
      directLaborRateVariance: fv03Field,
      directLaborEfficiencyVariance: fv04Field,
      variableOverheadSpendingVariance: fv05Field,
      variableOverheadEfficiencyVariance: fv06Field,
      fixedOverheadSpendingVariance: fv07aField,
      fixedOverheadVolumeVariance: fv07bField,
      totalManufacturingCostForecastVariance: fv08.value,
    },
  };
}

export function evaluateManufacturingVariances(
  inputs: ManufacturingEvaluatorInputs,
): ManufacturingEvaluatorResult<ManufacturingVariancePanelContract> {
  const basisCheck = assertReportingBasisConsistency(inputs.context.reportingBasis, inputs.reportingBasis);
  if (!basisCheck.ok) return basisCheck;

  if (inputs.productionVolumeForPeriod < 0) {
    return { ok: false, error: "NEGATIVE_PRODUCTION_VOLUME" };
  }

  const materialsResult = evaluateDirectMaterials(inputs);
  if (!materialsResult.ok) return materialsResult;

  const laborResult = evaluateDirectLabor(inputs.directLabor, inputs.unitOfMeasure);
  if (!laborResult.ok) return laborResult;

  const vohResult = evaluateVariableOverhead(inputs.variableOverhead, inputs.unitOfMeasure);
  if (!vohResult.ok) return vohResult;

  const fohResult = evaluateFixedOverhead(inputs.fixedOverhead, inputs.unitOfMeasure);
  if (!fohResult.ok) return fohResult;

  const totalResult = totalManufacturingCost(
    [
      materialsResult.value.directMaterialsPriceVariance,
      materialsResult.value.directMaterialsUsageVariance,
      laborResult.value.directLaborRateVariance,
      laborResult.value.directLaborEfficiencyVariance,
      vohResult.value.variableOverheadSpendingVariance,
      vohResult.value.variableOverheadEfficiencyVariance,
      fohResult.value.fixedOverheadSpendingVariance,
      fohResult.value.fixedOverheadVolumeVariance,
    ],
    inputs.unitOfMeasure,
  );
  if (!totalResult.ok) return totalResult;

  let forecastVarianceSection: ManufacturingForecastVarianceSection | undefined;
  if (inputs.forecast) {
    const forecastResult = buildForecastSection(inputs);
    if (!forecastResult.ok) return forecastResult;
    forecastVarianceSection = forecastResult.value;
  }

  return {
    ok: true,
    value: {
      companyId: inputs.companyId,
      accountingPeriod: inputs.accountingPeriod,
      context: inputs.context,
      directMaterialsPriceVariance: materialsResult.value.directMaterialsPriceVariance,
      directMaterialsUsageVariance: materialsResult.value.directMaterialsUsageVariance,
      directLaborRateVariance: laborResult.value.directLaborRateVariance,
      directLaborEfficiencyVariance: laborResult.value.directLaborEfficiencyVariance,
      variableOverheadSpendingVariance: vohResult.value.variableOverheadSpendingVariance,
      variableOverheadEfficiencyVariance: vohResult.value.variableOverheadEfficiencyVariance,
      fixedOverheadSpendingVariance: fohResult.value.fixedOverheadSpendingVariance,
      fixedOverheadVolumeVariance: fohResult.value.fixedOverheadVolumeVariance,
      totalManufacturingCostVariance: totalResult.value,
      directMaterialsMixVariance: materialsResult.value.directMaterialsMixVariance,
      directMaterialsYieldVariance: materialsResult.value.directMaterialsYieldVariance,
      standardsBasis: inputs.standardsBasis,
      productionVolumeForPeriod: inputs.productionVolumeForPeriod,
      unitOfMeasure: inputs.unitOfMeasure,
      reportingBasis: inputs.context.reportingBasis,
      forecastVarianceSection,
    },
  };
}
