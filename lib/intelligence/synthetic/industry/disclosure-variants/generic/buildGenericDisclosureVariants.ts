import {
  buildGenericDisclosureVariant,
  PHASE_42K_GENERIC_DISCLOSURE_BLUEPRINT,
  type BuildGenericDisclosureVariantInput,
  type SyntheticIndustryDisclosure,
} from "./buildGenericDisclosureVariant";

export interface BuildGenericDisclosureVariantsInput {
  industryDisclosures?: BuildGenericDisclosureVariantInput[];
}

export interface BuildGenericDisclosureVariantsResult {
  industryDisclosures: SyntheticIndustryDisclosure[];
  skippedIndexes: number[];
  warnings: string[];
}

function getDisclosureInputs(input: BuildGenericDisclosureVariantsInput): BuildGenericDisclosureVariantInput[] {
  return input.industryDisclosures ?? [...PHASE_42K_GENERIC_DISCLOSURE_BLUEPRINT];
}

export function buildGenericDisclosureVariants(
  input: BuildGenericDisclosureVariantsInput,
): BuildGenericDisclosureVariantsResult {
  const industryDisclosures: SyntheticIndustryDisclosure[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const disclosureInputs = getDisclosureInputs(input);

  disclosureInputs.forEach((disclosureInput, index) => {
    const result = buildGenericDisclosureVariant({
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
