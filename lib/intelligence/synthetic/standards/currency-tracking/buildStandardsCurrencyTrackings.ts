import {
  buildStandardsCurrencyTracking,
  type BuildStandardsCurrencyTrackingInput,
  type SyntheticStandardsCurrencyTracking,
} from "./buildStandardsCurrencyTracking";

export interface BuildStandardsCurrencyTrackingsInput {
  standardsCurrencyTrackings: BuildStandardsCurrencyTrackingInput[];
}

export interface BuildStandardsCurrencyTrackingsResult {
  standardsCurrencyTrackings: SyntheticStandardsCurrencyTracking[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildStandardsCurrencyTrackings(
  input: BuildStandardsCurrencyTrackingsInput,
): BuildStandardsCurrencyTrackingsResult {
  const standardsCurrencyTrackings: SyntheticStandardsCurrencyTracking[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.standardsCurrencyTrackings.forEach((trackingInput, index) => {
    const result = buildStandardsCurrencyTracking({
      ...trackingInput,
      skippedIndexes: [...(trackingInput.skippedIndexes ?? []), index],
    });

    if (result.standardsCurrencyTracking) {
      standardsCurrencyTrackings.push(result.standardsCurrencyTracking);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `standardsCurrencyTracking[${index}]: ${warning}`),
    );
  });

  return {
    standardsCurrencyTrackings,
    skippedIndexes,
    warnings,
  };
}
