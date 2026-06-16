import {
  buildDriveOutput,
  type BuildDriveOutputInput,
  type SyntheticDriveOutput,
} from "./buildDriveOutput";

export interface BuildDriveOutputsInput {
  items: BuildDriveOutputInput[];
}

export interface BuildDriveOutputsResult {
  driveOutputs: SyntheticDriveOutput[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildDriveOutputs(input: BuildDriveOutputsInput): BuildDriveOutputsResult {
  const driveOutputs: SyntheticDriveOutput[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildDriveOutput(item);

    if (result.driveOutput) {
      driveOutputs.push(result.driveOutput);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `driveOutputs[${index}]: ${warning}`));
  });

  return {
    driveOutputs,
    skippedIndexes,
    warnings,
  };
}
