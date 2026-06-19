import { buildPHITag, type BuildPHITagInput, type SyntheticPHITag } from "./buildPHITag";

export interface BuildPHITagsInput {
  phiTags: BuildPHITagInput[];
}

export interface BuildPHITagsResult {
  phiTags: SyntheticPHITag[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPHITags(input: BuildPHITagsInput): BuildPHITagsResult {
  const phiTags: SyntheticPHITag[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.phiTags.forEach((phiTagInput, index) => {
    const result = buildPHITag({
      ...phiTagInput,
      skippedIndexes: [...(phiTagInput.skippedIndexes ?? []), index],
    });

    if (result.phiTag) {
      phiTags.push(result.phiTag);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `phiTag[${index}]: ${warning}`));
  });

  return {
    phiTags,
    skippedIndexes,
    warnings,
  };
}
