import {
  buildPortfolioKnowledgePackage,
  type BuildPortfolioKnowledgePackageInput,
  type SyntheticPortfolioKnowledgePackage,
} from "./buildPortfolioKnowledgePackage";

export interface BuildPortfolioKnowledgePackagesInput {
  packages: BuildPortfolioKnowledgePackageInput[];
}

export interface BuildPortfolioKnowledgePackagesResult {
  portfolioKnowledgePackages: SyntheticPortfolioKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPortfolioKnowledgePackages(
  input: BuildPortfolioKnowledgePackagesInput,
): BuildPortfolioKnowledgePackagesResult {
  const portfolioKnowledgePackages: SyntheticPortfolioKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildPortfolioKnowledgePackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packages[${index}]: ${warning}`));

    if (result.portfolioKnowledgePackage) {
      portfolioKnowledgePackages.push(result.portfolioKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    portfolioKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
