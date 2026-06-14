import {
  buildAuditKnowledgePackage,
  type BuildAuditKnowledgePackageInput,
  type SyntheticAuditKnowledgePackage,
} from "./buildAuditKnowledgePackage";

export interface BuildAuditKnowledgePackagesInput {
  auditKnowledgeInputs: BuildAuditKnowledgePackageInput[];
}

export interface BuildAuditKnowledgePackagesResult {
  auditKnowledgePackages: SyntheticAuditKnowledgePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditKnowledgePackages(input: BuildAuditKnowledgePackagesInput): BuildAuditKnowledgePackagesResult {
  const auditKnowledgePackages: SyntheticAuditKnowledgePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.auditKnowledgeInputs.forEach((auditKnowledgeInput, index) => {
    const result = buildAuditKnowledgePackage(auditKnowledgeInput);

    warnings.push(...result.warnings.map((warning) => `auditKnowledgeInputs[${index}]: ${warning}`));

    if (result.auditKnowledgePackage) {
      auditKnowledgePackages.push(result.auditKnowledgePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    auditKnowledgePackages,
    skippedIndexes,
    warnings,
  };
}
