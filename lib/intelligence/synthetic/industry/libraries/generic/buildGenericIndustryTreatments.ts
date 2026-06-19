import {
  buildGenericIndustryTreatment,
  PHASE_42I_GENERIC_TREATMENT_BLUEPRINT,
  type BuildGenericIndustryTreatmentInput,
  type SyntheticIndustryTreatment,
} from "./buildGenericIndustryTreatment";

export interface BuildGenericIndustryTreatmentsInput {
  industryTreatments?: BuildGenericIndustryTreatmentInput[];
}

export interface BuildGenericIndustryTreatmentsResult {
  industryTreatments: SyntheticIndustryTreatment[];
  skippedIndexes: number[];
  warnings: string[];
}

function getTreatmentInputs(input: BuildGenericIndustryTreatmentsInput): BuildGenericIndustryTreatmentInput[] {
  return input.industryTreatments ?? [...PHASE_42I_GENERIC_TREATMENT_BLUEPRINT];
}

export function buildGenericIndustryTreatments(
  input: BuildGenericIndustryTreatmentsInput,
): BuildGenericIndustryTreatmentsResult {
  const industryTreatments: SyntheticIndustryTreatment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const treatmentInputs = getTreatmentInputs(input);

  treatmentInputs.forEach((treatmentInput, index) => {
    const result = buildGenericIndustryTreatment({
      ...treatmentInput,
      skippedIndexes: [...(treatmentInput.skippedIndexes ?? []), index],
    });

    if (result.industryTreatment) {
      industryTreatments.push(result.industryTreatment);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `industryTreatment[${index}]: ${warning}`));
  });

  return {
    industryTreatments,
    skippedIndexes,
    warnings,
  };
}
