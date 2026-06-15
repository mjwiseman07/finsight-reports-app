import {
  buildErpActionCandidatePackage,
  type BuildErpActionCandidatePackageInput,
  type SyntheticErpActionCandidatePackage,
} from "./buildErpActionCandidatePackage";

export interface BuildErpActionCandidatePackagesInput {
  erpActionCandidatePackageInputs: BuildErpActionCandidatePackageInput[];
}

export interface BuildErpActionCandidatePackagesResult {
  erpActionCandidatePackages: SyntheticErpActionCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildErpActionCandidatePackages(
  input: BuildErpActionCandidatePackagesInput,
): BuildErpActionCandidatePackagesResult {
  const erpActionCandidatePackages: SyntheticErpActionCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.erpActionCandidatePackageInputs.forEach((erpActionCandidatePackageInput, index) => {
    const result = buildErpActionCandidatePackage(erpActionCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `erpActionCandidatePackageInputs[${index}]: ${warning}`));

    if (result.erpActionCandidatePackage) {
      erpActionCandidatePackages.push(result.erpActionCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    erpActionCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
