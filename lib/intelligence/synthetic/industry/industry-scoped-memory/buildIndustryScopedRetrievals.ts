import {
  buildIndustryScopedRetrieval,
  type BuildIndustryScopedRetrievalInput,
  type SyntheticIndustryScopedRetrieval,
} from "./buildIndustryScopedRetrieval";

export interface BuildIndustryScopedRetrievalsInput {
  industryScopedRetrievals: BuildIndustryScopedRetrievalInput[];
}

export interface BuildIndustryScopedRetrievalsResult {
  industryScopedRetrievals: SyntheticIndustryScopedRetrieval[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildIndustryScopedRetrievals(
  input: BuildIndustryScopedRetrievalsInput,
): BuildIndustryScopedRetrievalsResult {
  const industryScopedRetrievals: SyntheticIndustryScopedRetrieval[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.industryScopedRetrievals.forEach((retrievalInput, index) => {
    const result = buildIndustryScopedRetrieval({
      ...retrievalInput,
      skippedIndexes: [...(retrievalInput.skippedIndexes ?? []), index],
    });

    if (result.industryScopedRetrieval) {
      industryScopedRetrievals.push(result.industryScopedRetrieval);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `industryScopedRetrieval[${index}]: ${warning}`));
  });

  return {
    industryScopedRetrievals,
    skippedIndexes,
    warnings,
  };
}
