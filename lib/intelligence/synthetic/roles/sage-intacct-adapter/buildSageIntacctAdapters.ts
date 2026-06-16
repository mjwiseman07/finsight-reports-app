import {
  buildSageIntacctAdapter,
  type BuildSageIntacctAdapterInput,
  type SyntheticSageIntacctAdapter,
} from "./buildSageIntacctAdapter";

export interface BuildSageIntacctAdaptersInput {
  items: BuildSageIntacctAdapterInput[];
}

export interface BuildSageIntacctAdaptersResult {
  sageIntacctAdapters: SyntheticSageIntacctAdapter[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSageIntacctAdapters(input: BuildSageIntacctAdaptersInput): BuildSageIntacctAdaptersResult {
  const sageIntacctAdapters: SyntheticSageIntacctAdapter[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildSageIntacctAdapter(item);

    if (result.sageIntacctAdapter) {
      sageIntacctAdapters.push(result.sageIntacctAdapter);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `sageIntacctAdapters[${index}]: ${warning}`));
  });

  return {
    sageIntacctAdapters,
    skippedIndexes,
    warnings,
  };
}
