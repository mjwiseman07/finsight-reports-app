import {
  buildAutomationGovernancePackage,
  type BuildAutomationGovernancePackageInput,
  type SyntheticAutomationGovernancePackage,
} from "./buildAutomationGovernancePackage";

export interface BuildAutomationGovernancePackagesInput {
  automationGovernancePackageInputs: BuildAutomationGovernancePackageInput[];
}

export interface BuildAutomationGovernancePackagesResult {
  automationGovernancePackages: SyntheticAutomationGovernancePackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAutomationGovernancePackages(
  input: BuildAutomationGovernancePackagesInput,
): BuildAutomationGovernancePackagesResult {
  const automationGovernancePackages: SyntheticAutomationGovernancePackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.automationGovernancePackageInputs.forEach((automationGovernancePackageInput, index) => {
    const result = buildAutomationGovernancePackage(automationGovernancePackageInput);

    warnings.push(...result.warnings.map((warning) => `automationGovernancePackageInputs[${index}]: ${warning}`));

    if (result.automationGovernancePackage) {
      automationGovernancePackages.push(result.automationGovernancePackage);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    automationGovernancePackages,
    skippedIndexes,
    warnings,
  };
}
