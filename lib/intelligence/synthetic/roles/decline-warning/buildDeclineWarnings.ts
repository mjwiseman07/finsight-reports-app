import {
  buildDeclineWarning,
  type BuildDeclineWarningInput,
  type SyntheticDeclineWarning,
} from "./buildDeclineWarning";

export interface BuildDeclineWarningsInput {
  declineWarnings: BuildDeclineWarningInput[];
}

export interface BuildDeclineWarningsResult {
  declineWarnings: SyntheticDeclineWarning[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDeclineWarnings(input: BuildDeclineWarningsInput): BuildDeclineWarningsResult {
  const declineWarnings: SyntheticDeclineWarning[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.declineWarnings.forEach((declineWarningInput, index) => {
    const result = buildDeclineWarning({
      ...declineWarningInput,
      skippedIndexes: [...(declineWarningInput.skippedIndexes ?? []), index],
    });

    if (result.declineWarning) {
      declineWarnings.push(result.declineWarning);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `declineWarning[${index}]: ${warning}`));
  });

  return {
    declineWarnings,
    skippedIndexes,
    warnings,
  };
}
