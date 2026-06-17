import {
  buildFormattedEmailEntry,
  type BuildFormattedEmailEntryInput,
  type SyntheticFormattedEmailEntry,
} from "./buildFormattedEmailEntry";

export interface BuildFormattedEmailEntriesInput {
  items: BuildFormattedEmailEntryInput[];
}

export interface BuildFormattedEmailEntriesResult {
  formattedEmailEntries: SyntheticFormattedEmailEntry[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFormattedEmailEntries(
  input: BuildFormattedEmailEntriesInput,
): BuildFormattedEmailEntriesResult {
  const formattedEmailEntries: SyntheticFormattedEmailEntry[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildFormattedEmailEntry(item);

    if (result.formattedEmailEntry) {
      formattedEmailEntries.push(result.formattedEmailEntry);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `formattedEmailEntries[${index}]: ${warning}`));
  });

  return {
    formattedEmailEntries,
    skippedIndexes,
    warnings,
  };
}
