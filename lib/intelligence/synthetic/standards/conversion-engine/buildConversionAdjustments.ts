import {
  buildConversionAdjustment,
  type BuildConversionAdjustmentInput,
  type SyntheticConversionAdjustment,
} from "./buildConversionAdjustment";

export interface BuildConversionAdjustmentsInput {
  conversionAdjustments: BuildConversionAdjustmentInput[];
}

export interface BuildConversionAdjustmentsResult {
  conversionAdjustments: SyntheticConversionAdjustment[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildConversionAdjustments(
  input: BuildConversionAdjustmentsInput,
): BuildConversionAdjustmentsResult {
  const conversionAdjustments: SyntheticConversionAdjustment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.conversionAdjustments.forEach((adjustmentInput, index) => {
    const result = buildConversionAdjustment({
      ...adjustmentInput,
      skippedIndexes: [...(adjustmentInput.skippedIndexes ?? []), index],
    });

    if (result.conversionAdjustment) {
      conversionAdjustments.push(result.conversionAdjustment);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `conversionAdjustment[${index}]: ${warning}`),
    );
  });

  return {
    conversionAdjustments,
    skippedIndexes,
    warnings,
  };
}
