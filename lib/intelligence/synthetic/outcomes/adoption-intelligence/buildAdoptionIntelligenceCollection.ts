import {
  buildAdoptionIntelligence,
  type BuildAdoptionIntelligenceInput,
  type BuildAdoptionIntelligenceResult,
  type SyntheticAdoptionIntelligence,
} from "./buildAdoptionIntelligence";

export interface BuildAdoptionIntelligenceCollectionInput {
  requests: BuildAdoptionIntelligenceInput[];
}

export interface BuildAdoptionIntelligenceCollectionResult {
  adoptionIntelligenceArtifacts: SyntheticAdoptionIntelligence[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAdoptionIntelligenceResult[];
}

export function buildAdoptionIntelligenceCollection(
  input: BuildAdoptionIntelligenceCollectionInput,
): BuildAdoptionIntelligenceCollectionResult {
  const adoptionIntelligenceArtifacts: SyntheticAdoptionIntelligence[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAdoptionIntelligenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      adoptionIntelligenceArtifacts,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAdoptionIntelligence(request);
    results.push(result);

    if (result.adoptionIntelligence) {
      adoptionIntelligenceArtifacts.push(result.adoptionIntelligence);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    adoptionIntelligenceArtifacts,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
