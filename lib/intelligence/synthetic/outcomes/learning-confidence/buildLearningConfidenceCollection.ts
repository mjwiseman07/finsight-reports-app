import {
  buildLearningConfidence,
  type BuildLearningConfidenceInput,
  type BuildLearningConfidenceResult,
  type SyntheticLearningConfidence,
} from "./buildLearningConfidence";

export interface BuildLearningConfidenceCollectionInput {
  requests: BuildLearningConfidenceInput[];
}

export interface BuildLearningConfidenceCollectionResult {
  learningConfidenceArtifacts: SyntheticLearningConfidence[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildLearningConfidenceResult[];
}

export function buildLearningConfidenceCollection(
  input: BuildLearningConfidenceCollectionInput,
): BuildLearningConfidenceCollectionResult {
  const learningConfidenceArtifacts: SyntheticLearningConfidence[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildLearningConfidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      learningConfidenceArtifacts,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildLearningConfidence(request);
    results.push(result);

    if (result.learningConfidence) {
      learningConfidenceArtifacts.push(result.learningConfidence);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    learningConfidenceArtifacts,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
