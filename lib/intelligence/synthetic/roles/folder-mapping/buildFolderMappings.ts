import {
  buildFolderMapping,
  type BuildFolderMappingInput,
  type SyntheticFolderMapping,
} from "./buildFolderMapping";

export interface BuildFolderMappingsInput {
  items: BuildFolderMappingInput[];
}

export interface BuildFolderMappingsResult {
  folderMappings: SyntheticFolderMapping[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFolderMappings(input: BuildFolderMappingsInput): BuildFolderMappingsResult {
  const folderMappings: SyntheticFolderMapping[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildFolderMapping(item);

    if (result.folderMapping) {
      folderMappings.push(result.folderMapping);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `folderMappings[${index}]: ${warning}`));
  });

  return {
    folderMappings,
    skippedIndexes,
    warnings,
  };
}
