import {
  buildReadAccessContext,
  type BuildReadAccessContextInput,
  type SyntheticReadAccessContext,
} from "./buildReadAccessContext";

export interface BuildReadAccessContextsInput {
  items: BuildReadAccessContextInput[];
}

export interface BuildReadAccessContextsResult {
  readAccessContexts: SyntheticReadAccessContext[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildReadAccessContexts(input: BuildReadAccessContextsInput): BuildReadAccessContextsResult {
  const readAccessContexts: SyntheticReadAccessContext[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildReadAccessContext(item);

    if (result.readAccessContext) {
      readAccessContexts.push(result.readAccessContext);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `readAccessContexts[${index}]: ${warning}`));
  });

  return {
    readAccessContexts,
    skippedIndexes,
    warnings,
  };
}
