import {
  buildOrganizationalHealthPackage,
  type BuildOrganizationalHealthPackageInput,
  type SyntheticOrganizationalHealthPackage,
} from "./buildOrganizationalHealthPackage";

export interface BuildOrganizationalHealthPackagesInput {
  organizationalHealthPackageInputs?: BuildOrganizationalHealthPackageInput[];
}

export interface BuildOrganizationalHealthPackagesResult {
  organizationalHealthPackages: SyntheticOrganizationalHealthPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildOrganizationalHealthPackages(
  input: BuildOrganizationalHealthPackagesInput,
): BuildOrganizationalHealthPackagesResult {
  const organizationalHealthPackages: SyntheticOrganizationalHealthPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.organizationalHealthPackageInputs).forEach((packageInput, index) => {
    const result = buildOrganizationalHealthPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `organizationalHealthPackage[${index}]: ${warning}`));

    if (result.skipped || !result.organizationalHealthPackage) {
      skippedIndexes.push(index);
      return;
    }

    organizationalHealthPackages.push(result.organizationalHealthPackage);
  });

  return {
    organizationalHealthPackages,
    skippedIndexes,
    warnings,
  };
}
