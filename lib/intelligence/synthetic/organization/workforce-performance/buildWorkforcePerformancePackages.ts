import {
  buildWorkforcePerformancePackage,
  type BuildWorkforcePerformancePackageInput,
  type SyntheticWorkforcePerformancePackage,
} from "./buildWorkforcePerformancePackage";

export interface BuildWorkforcePerformancePackagesInput {
  workforcePerformancePackageInputs?: BuildWorkforcePerformancePackageInput[];
}

export interface BuildWorkforcePerformancePackagesResult {
  workforcePerformancePackages: SyntheticWorkforcePerformancePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildWorkforcePerformancePackages(
  input: BuildWorkforcePerformancePackagesInput,
): BuildWorkforcePerformancePackagesResult {
  const workforcePerformancePackages: SyntheticWorkforcePerformancePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.workforcePerformancePackageInputs).forEach((packageInput, index) => {
    const result = buildWorkforcePerformancePackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `workforcePerformancePackage[${index}]: ${warning}`));

    if (result.skipped || !result.workforcePerformancePackage) {
      skippedIndexes.push(index);
      return;
    }

    workforcePerformancePackages.push(result.workforcePerformancePackage);
  });

  return {
    workforcePerformancePackages,
    skippedIndexes,
    warnings,
  };
}
