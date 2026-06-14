import { buildEnterpriseMemoryPackage, type BuildEnterpriseMemoryPackageInput, type SyntheticEnterpriseMemoryPackage } from "./buildEnterpriseMemoryPackage";

export interface BuildEnterpriseMemoryPackagesInput {
  enterpriseMemoryInputs: BuildEnterpriseMemoryPackageInput[];
}

export interface BuildEnterpriseMemoryPackagesResult {
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEnterpriseMemoryPackages(input: BuildEnterpriseMemoryPackagesInput): BuildEnterpriseMemoryPackagesResult {
  const enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.enterpriseMemoryInputs.forEach((enterpriseMemoryInput, index) => {
    const result = buildEnterpriseMemoryPackage(enterpriseMemoryInput);

    warnings.push(...result.warnings.map((warning) => `enterpriseMemoryInputs[${index}]: ${warning}`));

    if (result.enterpriseMemoryPackage) {
      enterpriseMemoryPackages.push(result.enterpriseMemoryPackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    enterpriseMemoryPackages,
    skippedIndexes,
    warnings,
  };
}
