import {
  buildOrganizationalMemoryPackage,
  type BuildOrganizationalMemoryPackageInput,
  type SyntheticOrganizationalMemoryPackage,
} from "./buildOrganizationalMemoryPackage";

export interface BuildOrganizationalMemoryPackagesInput {
  packageInputs: BuildOrganizationalMemoryPackageInput[];
}

export interface BuildOrganizationalMemoryPackagesResult {
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOrganizationalMemoryPackages(
  input: BuildOrganizationalMemoryPackagesInput,
): BuildOrganizationalMemoryPackagesResult {
  const organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.packageInputs.forEach((packageInput, index) => {
    const result = buildOrganizationalMemoryPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `packageInputs[${index}]: ${warning}`));

    if (result.organizationalMemoryPackage) {
      organizationalMemoryPackages.push(result.organizationalMemoryPackage);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }
  });

  return {
    organizationalMemoryPackages,
    skippedIndexes,
    warnings,
  };
}
