import {
  buildApprovalPackage,
  type BuildApprovalPackageInput,
  type SyntheticApprovalGovernance,
} from "./buildApprovalPackage";

export interface BuildApprovalPackagesInput {
  approvalPackageInputs: BuildApprovalPackageInput[];
}

export interface BuildApprovalPackagesResult {
  approvalGovernancePackages: SyntheticApprovalGovernance[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildApprovalPackages(input: BuildApprovalPackagesInput): BuildApprovalPackagesResult {
  const approvalGovernancePackages: SyntheticApprovalGovernance[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.approvalPackageInputs.forEach((approvalPackageInput, index) => {
    const result = buildApprovalPackage(approvalPackageInput);

    warnings.push(...result.warnings.map((warning) => `approvalPackageInputs[${index}]: ${warning}`));

    if (result.approvalGovernance) {
      approvalGovernancePackages.push(result.approvalGovernance);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    approvalGovernancePackages,
    skippedIndexes,
    warnings,
  };
}
