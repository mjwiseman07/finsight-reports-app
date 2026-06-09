import {
  buildInterventionIntelligence,
  type BuildInterventionIntelligenceInput,
  type BuildInterventionIntelligenceResult,
  type SyntheticInterventionIntelligence,
} from "./buildInterventionIntelligence";

export interface BuildInterventionIntelligenceCollectionInput {
  requests: BuildInterventionIntelligenceInput[];
}

export interface BuildInterventionIntelligenceCollectionResult {
  interventionIntelligenceArtifacts: SyntheticInterventionIntelligence[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildInterventionIntelligenceResult[];
}

export function buildInterventionIntelligenceCollection(
  input: BuildInterventionIntelligenceCollectionInput,
): BuildInterventionIntelligenceCollectionResult {
  const interventionIntelligenceArtifacts: SyntheticInterventionIntelligence[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildInterventionIntelligenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      interventionIntelligenceArtifacts,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildInterventionIntelligence(request);
    results.push(result);

    if (result.interventionIntelligence) {
      interventionIntelligenceArtifacts.push(result.interventionIntelligence);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    interventionIntelligenceArtifacts,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
