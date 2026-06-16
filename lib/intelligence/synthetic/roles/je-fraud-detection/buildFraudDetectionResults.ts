import {
  buildFraudDetectionResult,
  type BuildFraudDetectionResultInput,
  type SyntheticFraudDetectionResult,
} from "./buildFraudDetectionResult";

export interface BuildFraudDetectionResultsInput {
  items: BuildFraudDetectionResultInput[];
}

export interface BuildFraudDetectionResultsResult {
  fraudDetectionResults: SyntheticFraudDetectionResult[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFraudDetectionResults(
  input: BuildFraudDetectionResultsInput,
): BuildFraudDetectionResultsResult {
  const fraudDetectionResults: SyntheticFraudDetectionResult[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildFraudDetectionResult(item);

    if (result.fraudDetectionResult) {
      fraudDetectionResults.push(result.fraudDetectionResult);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `fraudDetectionResults[${index}]: ${warning}`));
  });

  return {
    fraudDetectionResults,
    skippedIndexes,
    warnings,
  };
}
