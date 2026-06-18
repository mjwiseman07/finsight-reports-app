import {
  buildDifferenceCatalogEntry,
  type BuildDifferenceCatalogEntryInput,
  type SyntheticDifferenceCatalogEntry,
} from "./buildDifferenceCatalogEntry";

export interface BuildDifferenceCatalogEntriesInput {
  differenceCatalogEntries: BuildDifferenceCatalogEntryInput[];
}

export interface BuildDifferenceCatalogEntriesResult {
  differenceCatalogEntries: SyntheticDifferenceCatalogEntry[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDifferenceCatalogEntries(
  input: BuildDifferenceCatalogEntriesInput,
): BuildDifferenceCatalogEntriesResult {
  const differenceCatalogEntries: SyntheticDifferenceCatalogEntry[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.differenceCatalogEntries.forEach((entryInput, index) => {
    const result = buildDifferenceCatalogEntry({
      ...entryInput,
      skippedIndexes: [...(entryInput.skippedIndexes ?? []), index],
    });

    if (result.differenceCatalogEntry) {
      differenceCatalogEntries.push(result.differenceCatalogEntry);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `differenceCatalogEntry[${index}]: ${warning}`),
    );
  });

  return {
    differenceCatalogEntries,
    skippedIndexes,
    warnings,
  };
}
