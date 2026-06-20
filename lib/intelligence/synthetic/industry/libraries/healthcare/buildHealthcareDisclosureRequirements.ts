import {
  buildHealthcareDisclosureRequirement,
  PHASE_42O_HEALTHCARE_DISCLOSURE_REQUIREMENT_BLUEPRINT,
  type BuildHealthcareDisclosureRequirementInput,
  type SyntheticHealthcareDisclosureRequirement,
} from "./buildHealthcareDisclosureRequirement";

export interface BuildHealthcareDisclosureRequirementsInput {
  industryDisclosureRequirements?: BuildHealthcareDisclosureRequirementInput[];
}

export interface BuildHealthcareDisclosureRequirementsResult {
  industryDisclosureRequirements: SyntheticHealthcareDisclosureRequirement[];
  skippedIndexes: number[];
  warnings: string[];
}

function getDisclosureRequirementInputs(
  input: BuildHealthcareDisclosureRequirementsInput,
): BuildHealthcareDisclosureRequirementInput[] {
  return (
    input.industryDisclosureRequirements ?? [...PHASE_42O_HEALTHCARE_DISCLOSURE_REQUIREMENT_BLUEPRINT]
  );
}

export function buildHealthcareDisclosureRequirements(
  input: BuildHealthcareDisclosureRequirementsInput,
): BuildHealthcareDisclosureRequirementsResult {
  const industryDisclosureRequirements: SyntheticHealthcareDisclosureRequirement[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const disclosureRequirementInputs = getDisclosureRequirementInputs(input);

  disclosureRequirementInputs.forEach((disclosureRequirementInput, index) => {
    const result = buildHealthcareDisclosureRequirement({
      ...disclosureRequirementInput,
      skippedIndexes: [...(disclosureRequirementInput.skippedIndexes ?? []), index],
    });

    if (result.industryDisclosureRequirement) {
      industryDisclosureRequirements.push(result.industryDisclosureRequirement);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map(
        (warning) => `industryDisclosureRequirement[${index}]: ${warning}`,
      ),
    );
  });

  return {
    industryDisclosureRequirements,
    skippedIndexes,
    warnings,
  };
}
