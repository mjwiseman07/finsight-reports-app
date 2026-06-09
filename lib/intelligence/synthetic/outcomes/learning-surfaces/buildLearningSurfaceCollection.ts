import {
  buildLearningSurface,
  type BuildLearningSurfaceInput,
  type BuildLearningSurfaceResult,
  type SyntheticLearningSurface,
} from "./buildLearningSurface";

export interface BuildLearningSurfaceCollectionInput {
  requests: BuildLearningSurfaceInput[];
}

export interface BuildLearningSurfaceCollectionResult {
  learningSurfaces: SyntheticLearningSurface[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildLearningSurfaceResult[];
}

export function buildLearningSurfaceCollection(
  input: BuildLearningSurfaceCollectionInput,
): BuildLearningSurfaceCollectionResult {
  const learningSurfaces: SyntheticLearningSurface[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildLearningSurfaceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      learningSurfaces,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildLearningSurface(request);
    results.push(result);

    if (result.learningSurface) {
      learningSurfaces.push(result.learningSurface);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    learningSurfaces,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
