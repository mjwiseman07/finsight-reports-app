import {
  buildPayrollActionCandidatePackage,
  type BuildPayrollActionCandidatePackageInput,
  type SyntheticPayrollActionCandidatePackage,
} from "./buildPayrollActionCandidatePackage";

export interface BuildPayrollActionCandidatePackagesInput {
  payrollActionCandidatePackageInputs: BuildPayrollActionCandidatePackageInput[];
}

export interface BuildPayrollActionCandidatePackagesResult {
  payrollActionCandidatePackages: SyntheticPayrollActionCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPayrollActionCandidatePackages(
  input: BuildPayrollActionCandidatePackagesInput,
): BuildPayrollActionCandidatePackagesResult {
  const payrollActionCandidatePackages: SyntheticPayrollActionCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.payrollActionCandidatePackageInputs.forEach((payrollActionCandidatePackageInput, index) => {
    const result = buildPayrollActionCandidatePackage(payrollActionCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `payrollActionCandidatePackageInputs[${index}]: ${warning}`));

    if (result.payrollActionCandidatePackage) {
      payrollActionCandidatePackages.push(result.payrollActionCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    payrollActionCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
