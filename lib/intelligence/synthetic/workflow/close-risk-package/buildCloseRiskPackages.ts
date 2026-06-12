import {
  buildCloseRiskPackage,
  type BuildCloseRiskPackageInput,
  type SyntheticCloseRiskPackage,
} from "./buildCloseRiskPackage";

export interface BuildCloseRiskPackagesInput {
  closeRiskPackageInputs: BuildCloseRiskPackageInput[];
}

export interface BuildCloseRiskPackagesResult {
  closeRiskPackages: SyntheticCloseRiskPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCloseRiskPackages(input: BuildCloseRiskPackagesInput): BuildCloseRiskPackagesResult {
  const closeRiskPackages: SyntheticCloseRiskPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.closeRiskPackageInputs.forEach((closeRiskPackageInput, index) => {
    const result = buildCloseRiskPackage(closeRiskPackageInput);
    warnings.push(...result.warnings.map((warning) => `closeRiskPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.closeRiskPackage) {
      skippedIndexes.push(index);
      return;
    }

    closeRiskPackages.push(result.closeRiskPackage);
  });

  return {
    closeRiskPackages,
    skippedIndexes,
    warnings,
  };
}
