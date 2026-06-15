import {
  buildControllerActionCandidatePackage,
  type BuildControllerActionCandidatePackageInput,
  type SyntheticControllerActionCandidatePackage,
} from "./buildControllerActionCandidatePackage";

export interface BuildControllerActionCandidatePackagesInput {
  controllerActionCandidatePackageInputs: BuildControllerActionCandidatePackageInput[];
}

export interface BuildControllerActionCandidatePackagesResult {
  controllerActionCandidatePackages: SyntheticControllerActionCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildControllerActionCandidatePackages(
  input: BuildControllerActionCandidatePackagesInput,
): BuildControllerActionCandidatePackagesResult {
  const controllerActionCandidatePackages: SyntheticControllerActionCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.controllerActionCandidatePackageInputs.forEach((controllerActionCandidatePackageInput, index) => {
    const result = buildControllerActionCandidatePackage(controllerActionCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `controllerActionCandidatePackageInputs[${index}]: ${warning}`));

    if (result.controllerActionCandidatePackage) {
      controllerActionCandidatePackages.push(result.controllerActionCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    controllerActionCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
