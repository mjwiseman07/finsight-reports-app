import { buildAuditPackage, type BuildAuditPackageInput, type SyntheticAuditPackage } from "./buildAuditPackage";

export interface BuildAuditPackagesInput {
  auditPackageInputs: BuildAuditPackageInput[];
}

export interface BuildAuditPackagesResult {
  auditPackages: SyntheticAuditPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditPackages(input: BuildAuditPackagesInput): BuildAuditPackagesResult {
  const auditPackages: SyntheticAuditPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.auditPackageInputs.forEach((auditPackageInput, index) => {
    const result = buildAuditPackage(auditPackageInput);
    warnings.push(...result.warnings.map((warning) => `auditPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.auditPackage) {
      skippedIndexes.push(index);
      return;
    }

    auditPackages.push(result.auditPackage);
  });

  return {
    auditPackages,
    skippedIndexes,
    warnings,
  };
}
