import {
  buildGenericKPI,
  PHASE_42J_GENERIC_KPI_BLUEPRINT,
  type BuildGenericKPIInput,
  type SyntheticIndustryKPI,
} from "./buildGenericKPI";

export interface BuildGenericKPIsInput {
  industryKpis?: BuildGenericKPIInput[];
}

export interface BuildGenericKPIsResult {
  industryKpis: SyntheticIndustryKPI[];
  skippedIndexes: number[];
  warnings: string[];
}

function getKpiInputs(input: BuildGenericKPIsInput): BuildGenericKPIInput[] {
  return input.industryKpis ?? [...PHASE_42J_GENERIC_KPI_BLUEPRINT];
}

export function buildGenericKPIs(input: BuildGenericKPIsInput): BuildGenericKPIsResult {
  const industryKpis: SyntheticIndustryKPI[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const kpiInputs = getKpiInputs(input);

  kpiInputs.forEach((kpiInput, index) => {
    const result = buildGenericKPI({
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
