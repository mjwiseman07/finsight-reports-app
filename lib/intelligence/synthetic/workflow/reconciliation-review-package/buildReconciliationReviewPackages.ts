import {
  buildReconciliationReviewPackage,
  type BuildReconciliationReviewPackageInput,
  type SyntheticReconciliationReviewPackage,
} from "./buildReconciliationReviewPackage";

export interface BuildReconciliationReviewPackagesInput {
  reconciliationReviewPackageInputs: BuildReconciliationReviewPackageInput[];
}

export interface BuildReconciliationReviewPackagesResult {
  reconciliationReviewPackages: SyntheticReconciliationReviewPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildReconciliationReviewPackages(
  input: BuildReconciliationReviewPackagesInput,
): BuildReconciliationReviewPackagesResult {
  const reconciliationReviewPackages: SyntheticReconciliationReviewPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.reconciliationReviewPackageInputs.forEach((reconciliationReviewPackageInput, index) => {
    const result = buildReconciliationReviewPackage(reconciliationReviewPackageInput);
    warnings.push(...result.warnings.map((warning) => `reconciliationReviewPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.reconciliationReviewPackage) {
      skippedIndexes.push(index);
      return;
    }

    reconciliationReviewPackages.push(result.reconciliationReviewPackage);
  });

  return {
    reconciliationReviewPackages,
    skippedIndexes,
    warnings,
  };
}
