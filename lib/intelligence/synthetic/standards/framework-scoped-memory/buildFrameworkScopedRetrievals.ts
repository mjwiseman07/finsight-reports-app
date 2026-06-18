import {
  buildFrameworkScopedRetrieval,
  type BuildFrameworkScopedRetrievalInput,
  type SyntheticFrameworkScopedRetrieval,
} from "./buildFrameworkScopedRetrieval";

export interface BuildFrameworkScopedRetrievalsInput {
  frameworkScopedRetrievals: BuildFrameworkScopedRetrievalInput[];
}

export interface BuildFrameworkScopedRetrievalsResult {
  frameworkScopedRetrievals: SyntheticFrameworkScopedRetrieval[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFrameworkScopedRetrievals(
  input: BuildFrameworkScopedRetrievalsInput,
): BuildFrameworkScopedRetrievalsResult {
  const frameworkScopedRetrievals: SyntheticFrameworkScopedRetrieval[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.frameworkScopedRetrievals.forEach((retrievalInput, index) => {
    const result = buildFrameworkScopedRetrieval({
      ...retrievalInput,
      skippedIndexes: [...(retrievalInput.skippedIndexes ?? []), index],
    });

    if (result.frameworkScopedRetrieval) {
      frameworkScopedRetrievals.push(result.frameworkScopedRetrieval);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `frameworkScopedRetrieval[${index}]: ${warning}`),
    );
  });

  return {
    frameworkScopedRetrievals,
    skippedIndexes,
    warnings,
  };
}
