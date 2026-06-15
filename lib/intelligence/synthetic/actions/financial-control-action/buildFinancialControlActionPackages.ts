import {
  buildFinancialControlActionPackage,
  type BuildFinancialControlActionPackageInput,
  type SyntheticFinancialControlActionPackage,
} from "./buildFinancialControlActionPackage";

export interface BuildFinancialControlActionPackagesInput {
  financialControlActionPackageInputs: BuildFinancialControlActionPackageInput[];
}

export interface BuildFinancialControlActionPackagesResult {
  financialControlActionPackages: SyntheticFinancialControlActionPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFinancialControlActionPackages(
  input: BuildFinancialControlActionPackagesInput,
): BuildFinancialControlActionPackagesResult {
  const financialControlActionPackages: SyntheticFinancialControlActionPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.financialControlActionPackageInputs.forEach((financialControlActionPackageInput, index) => {
    const result = buildFinancialControlActionPackage(financialControlActionPackageInput);

    warnings.push(...result.warnings.map((warning) => `financialControlActionPackageInputs[${index}]: ${warning}`));

    if (result.financialControlActionPackage) {
      financialControlActionPackages.push(result.financialControlActionPackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    financialControlActionPackages,
    skippedIndexes,
    warnings,
  };
}
