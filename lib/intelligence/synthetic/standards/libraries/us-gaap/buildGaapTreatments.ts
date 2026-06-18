import {
  buildGaapTreatment,
  type BuildGaapTreatmentInput,
  type SyntheticGaapTreatment,
} from "./buildGaapTreatment";

export interface BuildGaapTreatmentsInput {
  gaapTreatments: BuildGaapTreatmentInput[];
}

export interface BuildGaapTreatmentsResult {
  gaapTreatments: SyntheticGaapTreatment[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildGaapTreatments(input: BuildGaapTreatmentsInput): BuildGaapTreatmentsResult {
  const gaapTreatments: SyntheticGaapTreatment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.gaapTreatments.forEach((treatmentInput, index) => {
    const result = buildGaapTreatment({
      ...treatmentInput,
      skippedIndexes: [...(treatmentInput.skippedIndexes ?? []), index],
    });

    if (result.gaapTreatment) {
      gaapTreatments.push(result.gaapTreatment);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `gaapTreatment[${index}]: ${warning}`));
  });

  return {
    gaapTreatments,
    skippedIndexes,
    warnings,
  };
}
