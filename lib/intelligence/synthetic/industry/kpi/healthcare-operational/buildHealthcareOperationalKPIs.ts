import {
  buildHealthcareOperationalKPI,
  PHASE_42N2_HEALTHCARE_OPERATIONAL_KPI_BLUEPRINT,
  type BuildHealthcareOperationalKPIInput,
  type SyntheticIndustryKPI,
} from "./buildHealthcareOperationalKPI";

export interface BuildHealthcareOperationalKPIsInput {
  industryKpis?: BuildHealthcareOperationalKPIInput[];
}

export interface BuildHealthcareOperationalKPIsResult {
  industryKpis: SyntheticIndustryKPI[];
  skippedIndexes: number[];
  warnings: string[];
}

function getKpiInputs(
  input: BuildHealthcareOperationalKPIsInput,
): BuildHealthcareOperationalKPIInput[] {
  return input.industryKpis ?? [...PHASE_42N2_HEALTHCARE_OPERATIONAL_KPI_BLUEPRINT];
}

export function buildHealthcareOperationalKPIs(
  input: BuildHealthcareOperationalKPIsInput,
): BuildHealthcareOperationalKPIsResult {
  const industryKpis: SyntheticIndustryKPI[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const kpiInputs = getKpiInputs(input);

  kpiInputs.forEach((kpiInput, index) => {
    const result = buildHealthcareOperationalKPI({
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
