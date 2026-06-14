import { buildPortfolioMemoryPackage, type BuildPortfolioMemoryPackageInput, type SyntheticPortfolioMemoryPackage } from "./buildPortfolioMemoryPackage";

export interface BuildPortfolioMemoryPackagesInput {
  portfolioMemoryInputs: BuildPortfolioMemoryPackageInput[];
}

export interface BuildPortfolioMemoryPackagesResult {
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPortfolioMemoryPackages(input: BuildPortfolioMemoryPackagesInput): BuildPortfolioMemoryPackagesResult {
  const portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.portfolioMemoryInputs.forEach((portfolioMemoryInput, index) => {
    const result = buildPortfolioMemoryPackage(portfolioMemoryInput);

    warnings.push(...result.warnings.map((warning) => `portfolioMemoryInputs[${index}]: ${warning}`));

    if (result.portfolioMemoryPackage) {
      portfolioMemoryPackages.push(result.portfolioMemoryPackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    portfolioMemoryPackages,
    skippedIndexes,
    warnings,
  };
}
