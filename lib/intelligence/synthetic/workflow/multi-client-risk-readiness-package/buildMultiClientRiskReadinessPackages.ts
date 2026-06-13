import {
  buildMultiClientRiskReadinessPackage,
  type BuildMultiClientRiskReadinessPackageInput,
  type SyntheticMultiClientRiskReadinessPackage,
} from "./buildMultiClientRiskReadinessPackage";

export interface BuildMultiClientRiskReadinessPackagesInput {
  packages: BuildMultiClientRiskReadinessPackageInput[];
}

export interface BuildMultiClientRiskReadinessPackagesResult {
  multiClientRiskReadinessPackages: SyntheticMultiClientRiskReadinessPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildMultiClientRiskReadinessPackages(
  input: BuildMultiClientRiskReadinessPackagesInput,
): BuildMultiClientRiskReadinessPackagesResult {
  const multiClientRiskReadinessPackages: SyntheticMultiClientRiskReadinessPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packages.forEach((packageInput, index) => {
    const result = buildMultiClientRiskReadinessPackage(packageInput);
    warnings.push(...result.warnings.map((warning) => `packages[${index}]: ${warning}`));

    if (result.multiClientRiskReadinessPackage) {
      multiClientRiskReadinessPackages.push(result.multiClientRiskReadinessPackage);
      return;
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    multiClientRiskReadinessPackages,
    skippedIndexes,
    warnings,
  };
}
