import {
  buildNetSuiteAdapter,
  type BuildNetSuiteAdapterInput,
  type SyntheticNetSuiteAdapter,
} from "./buildNetSuiteAdapter";

export interface BuildNetSuiteAdaptersInput {
  items: BuildNetSuiteAdapterInput[];
}

export interface BuildNetSuiteAdaptersResult {
  netSuiteAdapters: SyntheticNetSuiteAdapter[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildNetSuiteAdapters(input: BuildNetSuiteAdaptersInput): BuildNetSuiteAdaptersResult {
  const netSuiteAdapters: SyntheticNetSuiteAdapter[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildNetSuiteAdapter(item);

    if (result.netSuiteAdapter) {
      netSuiteAdapters.push(result.netSuiteAdapter);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `netSuiteAdapters[${index}]: ${warning}`));
  });

  return {
    netSuiteAdapters,
    skippedIndexes,
    warnings,
  };
}
