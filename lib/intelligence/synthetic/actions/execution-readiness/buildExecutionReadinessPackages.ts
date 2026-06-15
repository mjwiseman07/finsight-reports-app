import {
  buildExecutionReadinessPackage,
  type BuildExecutionReadinessPackageInput,
  type SyntheticExecutionReadiness,
} from "./buildExecutionReadinessPackage";

export interface BuildExecutionReadinessPackagesInput {
  executionReadinessPackageInputs: BuildExecutionReadinessPackageInput[];
}

export interface BuildExecutionReadinessPackagesResult {
  executionReadinessPackages: SyntheticExecutionReadiness[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildExecutionReadinessPackages(
  input: BuildExecutionReadinessPackagesInput,
): BuildExecutionReadinessPackagesResult {
  const executionReadinessPackages: SyntheticExecutionReadiness[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.executionReadinessPackageInputs.forEach((executionReadinessPackageInput, index) => {
    const result = buildExecutionReadinessPackage(executionReadinessPackageInput);

    warnings.push(...result.warnings.map((warning) => `executionReadinessPackageInputs[${index}]: ${warning}`));

    if (result.executionReadiness) {
      executionReadinessPackages.push(result.executionReadiness);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    executionReadinessPackages,
    skippedIndexes,
    warnings,
  };
}
