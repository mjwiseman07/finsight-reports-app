import {
  buildPayrollCommandCenterPackage,
  type BuildPayrollCommandCenterPackageInput,
  type SyntheticPayrollCommandCenterPackage,
} from "./buildPayrollCommandCenterPackage";

export interface BuildPayrollCommandCenterPackagesInput {
  payrollCommandCenterPackageInputs?: BuildPayrollCommandCenterPackageInput[];
}

export interface BuildPayrollCommandCenterPackagesResult {
  payrollCommandCenterPackages: SyntheticPayrollCommandCenterPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildPayrollCommandCenterPackages(
  input: BuildPayrollCommandCenterPackagesInput,
): BuildPayrollCommandCenterPackagesResult {
  const payrollCommandCenterPackages: SyntheticPayrollCommandCenterPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.payrollCommandCenterPackageInputs).forEach((packageInput, index) => {
    const result = buildPayrollCommandCenterPackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `payrollCommandCenterPackage[${index}]: ${warning}`));

    if (result.skipped || !result.payrollCommandCenterPackage) {
      skippedIndexes.push(index);
      return;
    }

    payrollCommandCenterPackages.push(result.payrollCommandCenterPackage);
  });

  return {
    payrollCommandCenterPackages,
    skippedIndexes,
    warnings,
  };
}
