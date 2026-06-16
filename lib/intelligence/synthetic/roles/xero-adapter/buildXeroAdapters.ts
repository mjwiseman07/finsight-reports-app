import {
  buildXeroAdapter,
  type BuildXeroAdapterInput,
  type SyntheticXeroAdapter,
} from "./buildXeroAdapter";

export interface BuildXeroAdaptersInput {
  items: BuildXeroAdapterInput[];
}

export interface BuildXeroAdaptersResult {
  xeroAdapters: SyntheticXeroAdapter[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildXeroAdapters(input: BuildXeroAdaptersInput): BuildXeroAdaptersResult {
  const xeroAdapters: SyntheticXeroAdapter[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildXeroAdapter(item);

    if (result.xeroAdapter) {
      xeroAdapters.push(result.xeroAdapter);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `xeroAdapters[${index}]: ${warning}`));
  });

  return {
    xeroAdapters,
    skippedIndexes,
    warnings,
  };
}
