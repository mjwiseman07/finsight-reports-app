import {
  buildHealthcareIndustryTreatment,
  PHASE_42M_HEALTHCARE_TREATMENT_BLUEPRINT,
  type BuildHealthcareIndustryTreatmentInput,
  type SyntheticIndustryTreatment,
} from "./buildHealthcareIndustryTreatment";

export interface BuildHealthcareIndustryTreatmentsInput {
  industryTreatments?: BuildHealthcareIndustryTreatmentInput[];
}

export interface BuildHealthcareIndustryTreatmentsResult {
  industryTreatments: SyntheticIndustryTreatment[];
  skippedIndexes: number[];
  warnings: string[];
}

function getTreatmentInputs(
  input: BuildHealthcareIndustryTreatmentsInput,
): BuildHealthcareIndustryTreatmentInput[] {
  return input.industryTreatments ?? [...PHASE_42M_HEALTHCARE_TREATMENT_BLUEPRINT];
}

export function buildHealthcareIndustryTreatments(
  input: BuildHealthcareIndustryTreatmentsInput,
): BuildHealthcareIndustryTreatmentsResult {
  const industryTreatments: SyntheticIndustryTreatment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const treatmentInputs = getTreatmentInputs(input);

  treatmentInputs.forEach((treatmentInput, index) => {
    const result = buildHealthcareIndustryTreatment({
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
