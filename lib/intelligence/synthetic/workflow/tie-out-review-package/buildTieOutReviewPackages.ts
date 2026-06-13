import {
  buildTieOutReviewPackage,
  type BuildTieOutReviewPackageInput,
  type SyntheticTieOutReviewPackage,
} from "./buildTieOutReviewPackage";

export interface BuildTieOutReviewPackagesInput {
  tieOutReviewPackageInputs: BuildTieOutReviewPackageInput[];
}

export interface BuildTieOutReviewPackagesResult {
  tieOutReviewPackages: SyntheticTieOutReviewPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildTieOutReviewPackages(input: BuildTieOutReviewPackagesInput): BuildTieOutReviewPackagesResult {
  const tieOutReviewPackages: SyntheticTieOutReviewPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.tieOutReviewPackageInputs.forEach((tieOutReviewPackageInput, index) => {
    const result = buildTieOutReviewPackage(tieOutReviewPackageInput);
    warnings.push(...result.warnings.map((warning) => `tieOutReviewPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.tieOutReviewPackage) {
      skippedIndexes.push(index);
      return;
    }

    tieOutReviewPackages.push(result.tieOutReviewPackage);
  });

  return {
    tieOutReviewPackages,
    skippedIndexes,
    warnings,
  };
}
