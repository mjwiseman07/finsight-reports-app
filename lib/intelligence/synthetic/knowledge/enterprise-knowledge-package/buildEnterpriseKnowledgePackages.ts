import {
  buildEnterpriseKnowledgePackage,
  type BuildEnterpriseKnowledgePackageInput,
  type SyntheticEnterpriseKnowledgePackage,
} from "./buildEnterpriseKnowledgePackage";

export interface BuildEnterpriseKnowledgePackagesInput {
  enterpriseKnowledgePackageInputs: BuildEnterpriseKnowledgePackageInput[];
}

export interface BuildEnterpriseKnowledgePackagesResult {
  enterpriseKnowledgePackages: SyntheticEnterpriseKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEnterpriseKnowledgePackages(
  input: BuildEnterpriseKnowledgePackagesInput,
): BuildEnterpriseKnowledgePackagesResult {
  const enterpriseKnowledgePackages: SyntheticEnterpriseKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.enterpriseKnowledgePackageInputs.forEach((enterpriseKnowledgePackageInput, index) => {
    const result = buildEnterpriseKnowledgePackage(enterpriseKnowledgePackageInput);

    warnings.push(...result.warnings.map((warning) => `enterpriseKnowledgePackageInputs[${index}]: ${warning}`));

    if (result.enterpriseKnowledgePackage) {
      enterpriseKnowledgePackages.push(result.enterpriseKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    enterpriseKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
