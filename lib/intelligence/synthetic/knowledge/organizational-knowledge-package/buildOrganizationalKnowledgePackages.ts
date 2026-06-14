import {
  buildOrganizationalKnowledgePackage,
  type BuildOrganizationalKnowledgePackageInput,
  type SyntheticOrganizationalKnowledgePackage,
} from "./buildOrganizationalKnowledgePackage";

export interface BuildOrganizationalKnowledgePackagesInput {
  organizationalKnowledgeInputs: BuildOrganizationalKnowledgePackageInput[];
}

export interface BuildOrganizationalKnowledgePackagesResult {
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOrganizationalKnowledgePackages(
  input: BuildOrganizationalKnowledgePackagesInput,
): BuildOrganizationalKnowledgePackagesResult {
  const organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.organizationalKnowledgeInputs.forEach((organizationalKnowledgeInput, index) => {
    const result = buildOrganizationalKnowledgePackage(organizationalKnowledgeInput);

    warnings.push(...result.warnings.map((warning) => `organizationalKnowledgeInputs[${index}]: ${warning}`));

    if (result.organizationalKnowledgePackage) {
      organizationalKnowledgePackages.push(result.organizationalKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    organizationalKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
