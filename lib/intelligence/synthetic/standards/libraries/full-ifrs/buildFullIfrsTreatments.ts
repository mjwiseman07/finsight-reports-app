import {
  buildFullIfrsTreatment,
  type BuildFullIfrsTreatmentInput,
  type SyntheticFullIfrsTreatment,
} from "./buildFullIfrsTreatment";

export interface BuildFullIfrsTreatmentsInput {
  fullIfrsTreatments: BuildFullIfrsTreatmentInput[];
}

export interface BuildFullIfrsTreatmentsResult {
  fullIfrsTreatments: SyntheticFullIfrsTreatment[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFullIfrsTreatments(
  input: BuildFullIfrsTreatmentsInput,
): BuildFullIfrsTreatmentsResult {
  const fullIfrsTreatments: SyntheticFullIfrsTreatment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.fullIfrsTreatments.forEach((treatmentInput, index) => {
    const result = buildFullIfrsTreatment({
      ...treatmentInput,
      skippedIndexes: [...(treatmentInput.skippedIndexes ?? []), index],
    });

    if (result.fullIfrsTreatment) {
      fullIfrsTreatments.push(result.fullIfrsTreatment);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `fullIfrsTreatment[${index}]: ${warning}`));
  });

  return {
    fullIfrsTreatments,
    skippedIndexes,
    warnings,
  };
}
