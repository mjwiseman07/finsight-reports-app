import {
  buildAuditResponsePackage,
  type BuildAuditResponsePackageInput,
  type SyntheticAuditResponsePackage,
} from "./buildAuditResponsePackage";

export interface BuildAuditResponsePackagesInput {
  packages: BuildAuditResponsePackageInput[];
}

export interface BuildAuditResponsePackagesResult {
  auditResponsePackages: SyntheticAuditResponsePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditResponsePackages(input: BuildAuditResponsePackagesInput): BuildAuditResponsePackagesResult {
  const auditResponsePackages: SyntheticAuditResponsePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildAuditResponsePackage(packageInput);

    if (result.auditResponsePackage) {
      auditResponsePackages.push(result.auditResponsePackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `package[${index}]: ${warning}`));
  });

  return {
    auditResponsePackages,
    skippedIndexes,
    warnings,
  };
}
