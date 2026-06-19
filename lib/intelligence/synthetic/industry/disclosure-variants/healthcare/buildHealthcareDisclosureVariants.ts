import {
  buildHealthcareDisclosureVariant,
  PHASE_42O_HEALTHCARE_DISCLOSURE_BLUEPRINT,
  type BuildHealthcareDisclosureVariantInput,
  type SyntheticIndustryDisclosure,
} from "./buildHealthcareDisclosureVariant";

export interface BuildHealthcareDisclosureVariantsInput {
  industryDisclosures?: BuildHealthcareDisclosureVariantInput[];
}

export interface BuildHealthcareDisclosureVariantsResult {
  industryDisclosures: SyntheticIndustryDisclosure[];
  skippedIndexes: number[];
  warnings: string[];
}

function getDisclosureInputs(
  input: BuildHealthcareDisclosureVariantsInput,
): BuildHealthcareDisclosureVariantInput[] {
  return input.industryDisclosures ?? [...PHASE_42O_HEALTHCARE_DISCLOSURE_BLUEPRINT];
}

export function buildHealthcareDisclosureVariants(
  input: BuildHealthcareDisclosureVariantsInput,
): BuildHealthcareDisclosureVariantsResult {
  const industryDisclosures: SyntheticIndustryDisclosure[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const disclosureInputs = getDisclosureInputs(input);

  disclosureInputs.forEach((disclosureInput, index) => {
    const result = buildHealthcareDisclosureVariant({
      ...disclosureInput,
      skippedIndexes: [...(disclosureInput.skippedIndexes ?? []), index],
    });

    if (result.industryDisclosure) {
      industryDisclosures.push(result.industryDisclosure);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `industryDisclosure[${index}]: ${warning}`));
  });

  return {
    industryDisclosures,
    skippedIndexes,
    warnings,
  };
}
