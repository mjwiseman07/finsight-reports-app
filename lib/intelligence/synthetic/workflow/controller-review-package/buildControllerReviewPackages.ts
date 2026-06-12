import {
  buildControllerReviewPackage,
  type BuildControllerReviewPackageInput,
  type SyntheticControllerReviewPackage,
} from "./buildControllerReviewPackage";

export interface BuildControllerReviewPackagesInput {
  controllerReviewPackageInputs: BuildControllerReviewPackageInput[];
}

export interface BuildControllerReviewPackagesResult {
  controllerReviewPackages: SyntheticControllerReviewPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildControllerReviewPackages(input: BuildControllerReviewPackagesInput): BuildControllerReviewPackagesResult {
  const controllerReviewPackages: SyntheticControllerReviewPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.controllerReviewPackageInputs.forEach((controllerReviewPackageInput, index) => {
    const result = buildControllerReviewPackage(controllerReviewPackageInput);
    warnings.push(...result.warnings.map((warning) => `controllerReviewPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.controllerReviewPackage) {
      skippedIndexes.push(index);
      return;
    }

    controllerReviewPackages.push(result.controllerReviewPackage);
  });

  return {
    controllerReviewPackages,
    skippedIndexes,
    warnings,
  };
}
