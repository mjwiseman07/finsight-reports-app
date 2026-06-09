import {
  buildTimeSavingsIntelligence,
  type BuildTimeSavingsIntelligenceInput,
  type BuildTimeSavingsIntelligenceResult,
  type SyntheticTimeSavingsIntelligence,
} from "./buildTimeSavingsIntelligence";

export interface BuildTimeSavingsIntelligenceCollectionInput {
  requests: BuildTimeSavingsIntelligenceInput[];
}

export interface BuildTimeSavingsIntelligenceCollectionResult {
  timeSavingsIntelligenceArtifacts: SyntheticTimeSavingsIntelligence[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildTimeSavingsIntelligenceResult[];
}

export function buildTimeSavingsIntelligenceCollection(
  input: BuildTimeSavingsIntelligenceCollectionInput,
): BuildTimeSavingsIntelligenceCollectionResult {
  const timeSavingsIntelligenceArtifacts: SyntheticTimeSavingsIntelligence[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildTimeSavingsIntelligenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      timeSavingsIntelligenceArtifacts,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildTimeSavingsIntelligence(request);
    results.push(result);

    if (result.timeSavingsIntelligence) {
      timeSavingsIntelligenceArtifacts.push(result.timeSavingsIntelligence);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    timeSavingsIntelligenceArtifacts,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
