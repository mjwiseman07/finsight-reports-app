import {
  buildHealthcarePpdActionCandidatePackage,
  type BuildHealthcarePpdActionCandidatePackageInput,
  type SyntheticHealthcarePpdActionCandidatePackage,
} from "./buildHealthcarePpdActionCandidatePackage";

export interface BuildHealthcarePpdActionCandidatePackagesInput {
  healthcarePpdActionCandidatePackageInputs: BuildHealthcarePpdActionCandidatePackageInput[];
}

export interface BuildHealthcarePpdActionCandidatePackagesResult {
  healthcarePpdActionCandidatePackages: SyntheticHealthcarePpdActionCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHealthcarePpdActionCandidatePackages(
  input: BuildHealthcarePpdActionCandidatePackagesInput,
): BuildHealthcarePpdActionCandidatePackagesResult {
  const healthcarePpdActionCandidatePackages: SyntheticHealthcarePpdActionCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.healthcarePpdActionCandidatePackageInputs.forEach((healthcarePpdActionCandidatePackageInput, index) => {
    const result = buildHealthcarePpdActionCandidatePackage(healthcarePpdActionCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `healthcarePpdActionCandidatePackageInputs[${index}]: ${warning}`));

    if (result.healthcarePpdActionCandidatePackage) {
      healthcarePpdActionCandidatePackages.push(result.healthcarePpdActionCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    healthcarePpdActionCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
