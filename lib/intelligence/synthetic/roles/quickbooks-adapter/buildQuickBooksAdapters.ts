import {
  buildQuickBooksAdapter,
  type BuildQuickBooksAdapterInput,
  type SyntheticQuickBooksAdapter,
} from "./buildQuickBooksAdapter";

export interface BuildQuickBooksAdaptersInput {
  items: BuildQuickBooksAdapterInput[];
}

export interface BuildQuickBooksAdaptersResult {
  quickBooksAdapters: SyntheticQuickBooksAdapter[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildQuickBooksAdapters(input: BuildQuickBooksAdaptersInput): BuildQuickBooksAdaptersResult {
  const quickBooksAdapters: SyntheticQuickBooksAdapter[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildQuickBooksAdapter(item);

    if (result.quickBooksAdapter) {
      quickBooksAdapters.push(result.quickBooksAdapter);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `quickBooksAdapters[${index}]: ${warning}`));
  });

  return {
    quickBooksAdapters,
    skippedIndexes,
    warnings,
  };
}
