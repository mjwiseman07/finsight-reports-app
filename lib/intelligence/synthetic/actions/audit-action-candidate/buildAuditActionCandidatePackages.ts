import {
  buildAuditActionCandidatePackage,
  type BuildAuditActionCandidatePackageInput,
  type SyntheticAuditActionCandidatePackage,
} from "./buildAuditActionCandidatePackage";

export interface BuildAuditActionCandidatePackagesInput {
  auditActionCandidatePackageInputs: BuildAuditActionCandidatePackageInput[];
}

export interface BuildAuditActionCandidatePackagesResult {
  auditActionCandidatePackages: SyntheticAuditActionCandidatePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAuditActionCandidatePackages(
  input: BuildAuditActionCandidatePackagesInput,
): BuildAuditActionCandidatePackagesResult {
  const auditActionCandidatePackages: SyntheticAuditActionCandidatePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.auditActionCandidatePackageInputs.forEach((auditActionCandidatePackageInput, index) => {
    const result = buildAuditActionCandidatePackage(auditActionCandidatePackageInput);

    warnings.push(...result.warnings.map((warning) => `auditActionCandidatePackageInputs[${index}]: ${warning}`));

    if (result.auditActionCandidatePackage) {
      auditActionCandidatePackages.push(result.auditActionCandidatePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    auditActionCandidatePackages,
    skippedIndexes,
    warnings,
  };
}
