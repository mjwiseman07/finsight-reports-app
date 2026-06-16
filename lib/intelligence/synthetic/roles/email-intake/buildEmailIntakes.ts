import {
  buildEmailIntake,
  type BuildEmailIntakeInput,
  type SyntheticEmailIntake,
} from "./buildEmailIntake";

export interface BuildEmailIntakesInput {
  items: BuildEmailIntakeInput[];
}

export interface BuildEmailIntakesResult {
  emailIntakes: SyntheticEmailIntake[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildEmailIntakes(input: BuildEmailIntakesInput): BuildEmailIntakesResult {
  const emailIntakes: SyntheticEmailIntake[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildEmailIntake(item);

    if (result.emailIntake) {
      emailIntakes.push(result.emailIntake);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `emailIntakes[${index}]: ${warning}`));
  });

  return {
    emailIntakes,
    skippedIndexes,
    warnings,
  };
}
