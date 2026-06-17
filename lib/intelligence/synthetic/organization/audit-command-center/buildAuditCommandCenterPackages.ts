import {
  buildAuditCommandCenterPackage,
  type BuildAuditCommandCenterPackageInput,
  type SyntheticAuditCommandCenterPackage,
} from "./buildAuditCommandCenterPackage";

export interface BuildAuditCommandCenterPackagesInput {
  auditCommandCenterPackageInputs?: BuildAuditCommandCenterPackageInput[];
}

export interface BuildAuditCommandCenterPackagesResult {
  auditCommandCenterPackages: SyntheticAuditCommandCenterPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildAuditCommandCenterPackages(
  input: BuildAuditCommandCenterPackagesInput,
): BuildAuditCommandCenterPackagesResult {
  const auditCommandCenterPackages: SyntheticAuditCommandCenterPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.auditCommandCenterPackageInputs).forEach((packageInput, index) => {
    const result = buildAuditCommandCenterPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `auditCommandCenterPackage[${index}]: ${warning}`));

    if (result.skipped || !result.auditCommandCenterPackage) {
      skippedIndexes.push(index);
      return;
    }

    auditCommandCenterPackages.push(result.auditCommandCenterPackage);
  });

  return {
    auditCommandCenterPackages,
    skippedIndexes,
    warnings,
  };
}
