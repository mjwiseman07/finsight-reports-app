import {
  buildDisclosureRequirement,
  type BuildDisclosureRequirementInput,
  type SyntheticDisclosureRequirement,
} from "./buildDisclosureRequirement";

export interface BuildDisclosureRequirementsInput {
  disclosureRequirements: BuildDisclosureRequirementInput[];
}

export interface BuildDisclosureRequirementsResult {
  disclosureRequirements: SyntheticDisclosureRequirement[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDisclosureRequirements(
  input: BuildDisclosureRequirementsInput,
): BuildDisclosureRequirementsResult {
  const disclosureRequirements: SyntheticDisclosureRequirement[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.disclosureRequirements.forEach((requirementInput, index) => {
    const result = buildDisclosureRequirement({
      ...requirementInput,
      skippedIndexes: [...(requirementInput.skippedIndexes ?? []), index],
    });

    if (result.disclosureRequirement) {
      disclosureRequirements.push(result.disclosureRequirement);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `disclosureRequirement[${index}]: ${warning}`),
    );
  });

  return {
    disclosureRequirements,
    skippedIndexes,
    warnings,
  };
}
