import {
  buildOAuthTokenLifecycle,
  type BuildOAuthTokenLifecycleInput,
  type SyntheticOAuthTokenLifecycle,
} from "./buildOAuthTokenLifecycle";

export interface BuildOAuthTokenLifecyclesInput {
  oauthTokenLifecycles: BuildOAuthTokenLifecycleInput[];
}

export interface BuildOAuthTokenLifecyclesResult {
  oauthTokenLifecycles: SyntheticOAuthTokenLifecycle[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOAuthTokenLifecycles(
  input: BuildOAuthTokenLifecyclesInput,
): BuildOAuthTokenLifecyclesResult {
  const oauthTokenLifecycles: SyntheticOAuthTokenLifecycle[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.oauthTokenLifecycles.forEach((lifecycleInput, index) => {
    const result = buildOAuthTokenLifecycle({
      ...lifecycleInput,
      skippedIndexes: [...(lifecycleInput.skippedIndexes ?? []), index],
    });

    if (result.oauthTokenLifecycle) {
      oauthTokenLifecycles.push(result.oauthTokenLifecycle);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `oauthTokenLifecycle[${index}]: ${warning}`));
  });

  return {
    oauthTokenLifecycles,
    skippedIndexes,
    warnings,
  };
}
