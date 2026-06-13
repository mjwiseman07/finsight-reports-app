import {
  buildHistoricalAuditPackage,
  type BuildHistoricalAuditPackageInput,
  type SyntheticHistoricalAuditPackage,
} from "./buildHistoricalAuditPackage";

export interface BuildHistoricalAuditPackagesInput {
  packageInputs: BuildHistoricalAuditPackageInput[];
}

export interface BuildHistoricalAuditPackagesResult {
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildHistoricalAuditPackages(input: BuildHistoricalAuditPackagesInput): BuildHistoricalAuditPackagesResult {
  const historicalAuditPackages: SyntheticHistoricalAuditPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildHistoricalAuditPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.historicalAuditPackage) {
      historicalAuditPackages.push(result.historicalAuditPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    historicalAuditPackages,
    skippedIndexes,
    warnings,
  };
}
