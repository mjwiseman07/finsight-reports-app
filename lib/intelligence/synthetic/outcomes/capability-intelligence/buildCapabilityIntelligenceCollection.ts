import {
  buildCapabilityIntelligence,
  type BuildCapabilityIntelligenceInput,
  type BuildCapabilityIntelligenceResult,
  type SyntheticCapabilityIntelligence,
} from "./buildCapabilityIntelligence";

export interface BuildCapabilityIntelligenceCollectionInput {
  requests: BuildCapabilityIntelligenceInput[];
}

export interface BuildCapabilityIntelligenceCollectionResult {
  capabilityIntelligenceArtifacts: SyntheticCapabilityIntelligence[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCapabilityIntelligenceResult[];
}

export function buildCapabilityIntelligenceCollection(
  input: BuildCapabilityIntelligenceCollectionInput,
): BuildCapabilityIntelligenceCollectionResult {
  const capabilityIntelligenceArtifacts: SyntheticCapabilityIntelligence[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCapabilityIntelligenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      capabilityIntelligenceArtifacts,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCapabilityIntelligence(request);
    results.push(result);

    if (result.capabilityIntelligence) {
      capabilityIntelligenceArtifacts.push(result.capabilityIntelligence);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    capabilityIntelligenceArtifacts,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
