import {
  buildFirmAuditPackage,
  type BuildFirmAuditPackageInput,
  type SyntheticFirmAuditPackage,
} from "./buildFirmAuditPackage";

export interface BuildFirmAuditPackagesInput {
  packages: BuildFirmAuditPackageInput[];
}

export interface BuildFirmAuditPackagesResult {
  firmAuditPackages: SyntheticFirmAuditPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFirmAuditPackages(input: BuildFirmAuditPackagesInput): BuildFirmAuditPackagesResult {
  const firmAuditPackages: SyntheticFirmAuditPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildFirmAuditPackage(packageInput);
    warnings.push(...result.warnings.map((warning) => `packages[${index}]: ${warning}`));

    if (result.firmAuditPackage) {
      firmAuditPackages.push(result.firmAuditPackage);
      return;
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    firmAuditPackages,
    skippedIndexes,
    warnings,
  };
}
