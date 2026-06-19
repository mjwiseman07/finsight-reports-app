import {
  buildIndustryResolution,
  type BuildIndustryResolutionInput,
  type SyntheticIndustryResolution,
} from "./buildIndustryResolution";

export interface BuildIndustryResolutionsInput {
  industryResolutions: BuildIndustryResolutionInput[];
}

export interface BuildIndustryResolutionsResult {
  industryResolutions: SyntheticIndustryResolution[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildIndustryResolutions(input: BuildIndustryResolutionsInput): BuildIndustryResolutionsResult {
  const industryResolutions: SyntheticIndustryResolution[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.industryResolutions.forEach((resolutionInput, index) => {
    const result = buildIndustryResolution({
      ...resolutionInput,
      skippedIndexes: [...(resolutionInput.skippedIndexes ?? []), index],
    });

    if (result.industryResolution) {
      industryResolutions.push(result.industryResolution);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `industryResolution[${index}]: ${warning}`));
  });

  return {
    industryResolutions,
    skippedIndexes,
    warnings,
  };
}
