import {
  buildValidationResult,
  type BuildValidationResultInput,
  type SyntheticValidationResult,
} from "./buildValidationResult";

export interface BuildValidationResultsInput {
  items: BuildValidationResultInput[];
}

export interface BuildValidationResultsResult {
  validationResults: SyntheticValidationResult[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildValidationResults(input: BuildValidationResultsInput): BuildValidationResultsResult {
  const validationResults: SyntheticValidationResult[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildValidationResult(item);

    if (result.validationResult) {
      validationResults.push(result.validationResult);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `validationResults[${index}]: ${warning}`));
  });

  return {
    validationResults,
    skippedIndexes,
    warnings,
  };
}
