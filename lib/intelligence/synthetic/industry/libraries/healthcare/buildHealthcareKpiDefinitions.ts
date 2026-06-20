import {
  buildHealthcareKpiDefinition,
  PHASE_42N1_HEALTHCARE_KPI_DEFINITION_BLUEPRINT,
  type BuildHealthcareKpiDefinitionInput,
  type SyntheticHealthcareKpiDefinition,
} from "./buildHealthcareKpiDefinition";

export interface BuildHealthcareKpiDefinitionsInput {
  industryKpiDefinitions?: BuildHealthcareKpiDefinitionInput[];
}

export interface BuildHealthcareKpiDefinitionsResult {
  industryKpiDefinitions: SyntheticHealthcareKpiDefinition[];
  skippedIndexes: number[];
  warnings: string[];
}

function getKpiDefinitionInputs(
  input: BuildHealthcareKpiDefinitionsInput,
): BuildHealthcareKpiDefinitionInput[] {
  return input.industryKpiDefinitions ?? [...PHASE_42N1_HEALTHCARE_KPI_DEFINITION_BLUEPRINT];
}

export function buildHealthcareKpiDefinitions(
  input: BuildHealthcareKpiDefinitionsInput,
): BuildHealthcareKpiDefinitionsResult {
  const industryKpiDefinitions: SyntheticHealthcareKpiDefinition[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const kpiDefinitionInputs = getKpiDefinitionInputs(input);

  kpiDefinitionInputs.forEach((kpiDefinitionInput, index) => {
    const result = buildHealthcareKpiDefinition({
      ...kpiDefinitionInput,
      skippedIndexes: [...(kpiDefinitionInput.skippedIndexes ?? []), index],
    });

    if (result.industryKpiDefinition) {
      industryKpiDefinitions.push(result.industryKpiDefinition);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `industryKpiDefinition[${index}]: ${warning}`),
    );
  });

  return {
    industryKpiDefinitions,
    skippedIndexes,
    warnings,
  };
}
