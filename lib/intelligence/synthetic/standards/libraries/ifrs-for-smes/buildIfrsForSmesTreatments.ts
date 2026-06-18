import {
  buildIfrsForSmesTreatment,
  type BuildIfrsForSmesTreatmentInput,
  type SyntheticIfrsForSmesTreatment,
} from "./buildIfrsForSmesTreatment";

export interface BuildIfrsForSmesTreatmentsInput {
  ifrsForSmesTreatments: BuildIfrsForSmesTreatmentInput[];
}

export interface BuildIfrsForSmesTreatmentsResult {
  ifrsForSmesTreatments: SyntheticIfrsForSmesTreatment[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildIfrsForSmesTreatments(
  input: BuildIfrsForSmesTreatmentsInput,
): BuildIfrsForSmesTreatmentsResult {
  const ifrsForSmesTreatments: SyntheticIfrsForSmesTreatment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.ifrsForSmesTreatments.forEach((treatmentInput, index) => {
    const result = buildIfrsForSmesTreatment({
      ...treatmentInput,
      skippedIndexes: [...(treatmentInput.skippedIndexes ?? []), index],
    });

    if (result.ifrsForSmesTreatment) {
      ifrsForSmesTreatments.push(result.ifrsForSmesTreatment);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `ifrsForSmesTreatment[${index}]: ${warning}`),
    );
  });

  return {
    ifrsForSmesTreatments,
    skippedIndexes,
    warnings,
  };
}
