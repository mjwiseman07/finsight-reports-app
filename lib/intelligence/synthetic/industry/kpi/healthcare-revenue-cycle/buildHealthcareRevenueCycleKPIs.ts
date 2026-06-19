import {
  buildHealthcareRevenueCycleKPI,
  PHASE_42N1_HEALTHCARE_REVENUE_CYCLE_KPI_BLUEPRINT,
  type BuildHealthcareRevenueCycleKPIInput,
  type SyntheticIndustryKPI,
} from "./buildHealthcareRevenueCycleKPI";

export interface BuildHealthcareRevenueCycleKPIsInput {
  industryKpis?: BuildHealthcareRevenueCycleKPIInput[];
}

export interface BuildHealthcareRevenueCycleKPIsResult {
  industryKpis: SyntheticIndustryKPI[];
  skippedIndexes: number[];
  warnings: string[];
}

function getKpiInputs(
  input: BuildHealthcareRevenueCycleKPIsInput,
): BuildHealthcareRevenueCycleKPIInput[] {
  return input.industryKpis ?? [...PHASE_42N1_HEALTHCARE_REVENUE_CYCLE_KPI_BLUEPRINT];
}

export function buildHealthcareRevenueCycleKPIs(
  input: BuildHealthcareRevenueCycleKPIsInput,
): BuildHealthcareRevenueCycleKPIsResult {
  const industryKpis: SyntheticIndustryKPI[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const kpiInputs = getKpiInputs(input);

  kpiInputs.forEach((kpiInput, index) => {
    const result = buildHealthcareRevenueCycleKPI({
      ...kpiInput,
      skippedIndexes: [...(kpiInput.skippedIndexes ?? []), index],
    });

    if (result.industryKpi) {
      industryKpis.push(result.industryKpi);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `industryKpi[${index}]: ${warning}`));
  });

  return {
    industryKpis,
    skippedIndexes,
    warnings,
  };
}
