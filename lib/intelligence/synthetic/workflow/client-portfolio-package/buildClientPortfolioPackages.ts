import {
  buildClientPortfolioPackage,
  type BuildClientPortfolioPackageInput,
  type SyntheticClientPortfolioPackage,
} from "./buildClientPortfolioPackage";

export interface BuildClientPortfolioPackagesInput {
  packages: BuildClientPortfolioPackageInput[];
}

export interface BuildClientPortfolioPackagesResult {
  clientPortfolioPackages: SyntheticClientPortfolioPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildClientPortfolioPackages(input: BuildClientPortfolioPackagesInput): BuildClientPortfolioPackagesResult {
  const clientPortfolioPackages: SyntheticClientPortfolioPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildClientPortfolioPackage(packageInput);
    warnings.push(...result.warnings.map((warning) => `packages[${index}]: ${warning}`));

    if (result.clientPortfolioPackage) {
      clientPortfolioPackages.push(result.clientPortfolioPackage);
      return;
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    clientPortfolioPackages,
    skippedIndexes,
    warnings,
  };
}
