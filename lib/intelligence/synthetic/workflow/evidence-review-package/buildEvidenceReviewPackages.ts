import {
  buildEvidenceReviewPackage,
  type BuildEvidenceReviewPackageInput,
  type SyntheticEvidenceReviewPackage,
} from "./buildEvidenceReviewPackage";

export interface BuildEvidenceReviewPackagesInput {
  packages: BuildEvidenceReviewPackageInput[];
}

export interface BuildEvidenceReviewPackagesResult {
  evidenceReviewPackages: SyntheticEvidenceReviewPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEvidenceReviewPackages(input: BuildEvidenceReviewPackagesInput): BuildEvidenceReviewPackagesResult {
  const evidenceReviewPackages: SyntheticEvidenceReviewPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildEvidenceReviewPackage(packageInput);
    warnings.push(...result.warnings.map((warning) => `packages[${index}]: ${warning}`));

    if (result.evidenceReviewPackage) {
      evidenceReviewPackages.push(result.evidenceReviewPackage);
      return;
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    evidenceReviewPackages,
    skippedIndexes,
    warnings,
  };
}
