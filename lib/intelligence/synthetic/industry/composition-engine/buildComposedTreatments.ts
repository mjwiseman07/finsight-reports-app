import {
  buildComposedTreatment,
  type BuildComposedTreatmentInput,
  type SyntheticComposedTreatment,
} from "./buildComposedTreatment";

export interface BuildComposedTreatmentsInput {
  composedTreatments: BuildComposedTreatmentInput[];
}

export interface BuildComposedTreatmentsResult {
  composedTreatments: SyntheticComposedTreatment[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildComposedTreatments(input: BuildComposedTreatmentsInput): BuildComposedTreatmentsResult {
  const composedTreatments: SyntheticComposedTreatment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.composedTreatments.forEach((composedTreatmentInput, index) => {
    const result = buildComposedTreatment({
      ...composedTreatmentInput,
      skippedIndexes: [...(composedTreatmentInput.skippedIndexes ?? []), index],
    });

    if (result.composedTreatment) {
      composedTreatments.push(result.composedTreatment);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `composedTreatment[${index}]: ${warning}`));
  });

  return {
    composedTreatments,
    skippedIndexes,
    warnings,
  };
}
