import {
  buildTreatmentResolution,
  type BuildTreatmentResolutionInput,
  type SyntheticTreatmentResolution,
} from "./buildTreatmentResolution";

export interface BuildTreatmentResolutionsInput {
  treatmentResolutions: BuildTreatmentResolutionInput[];
}

export interface BuildTreatmentResolutionsResult {
  treatmentResolutions: SyntheticTreatmentResolution[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildTreatmentResolutions(input: BuildTreatmentResolutionsInput): BuildTreatmentResolutionsResult {
  const treatmentResolutions: SyntheticTreatmentResolution[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.treatmentResolutions.forEach((resolutionInput, index) => {
    const result = buildTreatmentResolution({
      ...resolutionInput,
      skippedIndexes: [...(resolutionInput.skippedIndexes ?? []), index],
    });

    if (result.treatmentResolution) {
      treatmentResolutions.push(result.treatmentResolution);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `treatmentResolution[${index}]: ${warning}`));
  });

  return {
    treatmentResolutions,
    skippedIndexes,
    warnings,
  };
}
