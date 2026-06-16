import {
  buildDynamicsAdapter,
  type BuildDynamicsAdapterInput,
  type SyntheticDynamicsAdapter,
} from "./buildDynamicsAdapter";

export interface BuildDynamicsAdaptersInput {
  items: BuildDynamicsAdapterInput[];
}

export interface BuildDynamicsAdaptersResult {
  dynamicsAdapters: SyntheticDynamicsAdapter[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDynamicsAdapters(input: BuildDynamicsAdaptersInput): BuildDynamicsAdaptersResult {
  const dynamicsAdapters: SyntheticDynamicsAdapter[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildDynamicsAdapter(item);

    if (result.dynamicsAdapter) {
      dynamicsAdapters.push(result.dynamicsAdapter);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `dynamicsAdapters[${index}]: ${warning}`));
  });

  return {
    dynamicsAdapters,
    skippedIndexes,
    warnings,
  };
}
