import {
  buildFrameworkChangeGovernance,
  type BuildFrameworkChangeGovernanceInput,
  type SyntheticFrameworkChangeGovernance,
} from "./buildFrameworkChangeGovernance";

export interface BuildFrameworkChangeGovernancesInput {
  frameworkChangeGovernances: BuildFrameworkChangeGovernanceInput[];
}

export interface BuildFrameworkChangeGovernancesResult {
  frameworkChangeGovernances: SyntheticFrameworkChangeGovernance[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFrameworkChangeGovernances(
  input: BuildFrameworkChangeGovernancesInput,
): BuildFrameworkChangeGovernancesResult {
  const frameworkChangeGovernances: SyntheticFrameworkChangeGovernance[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.frameworkChangeGovernances.forEach((governanceInput, index) => {
    const result = buildFrameworkChangeGovernance({
      ...governanceInput,
      skippedIndexes: [...(governanceInput.skippedIndexes ?? []), index],
    });

    if (result.frameworkChangeGovernance) {
      frameworkChangeGovernances.push(result.frameworkChangeGovernance);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `frameworkChangeGovernance[${index}]: ${warning}`),
    );
  });

  return {
    frameworkChangeGovernances,
    skippedIndexes,
    warnings,
  };
}
