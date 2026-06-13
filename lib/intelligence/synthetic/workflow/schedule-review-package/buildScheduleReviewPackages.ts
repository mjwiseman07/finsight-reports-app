import {
  buildScheduleReviewPackage,
  type BuildScheduleReviewPackageInput,
  type SyntheticScheduleReviewPackage,
} from "./buildScheduleReviewPackage";

export interface BuildScheduleReviewPackagesInput {
  scheduleReviewPackageInputs: BuildScheduleReviewPackageInput[];
}

export interface BuildScheduleReviewPackagesResult {
  scheduleReviewPackages: SyntheticScheduleReviewPackage[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildScheduleReviewPackages(input: BuildScheduleReviewPackagesInput): BuildScheduleReviewPackagesResult {
  const scheduleReviewPackages: SyntheticScheduleReviewPackage[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.scheduleReviewPackageInputs.forEach((scheduleReviewPackageInput, index) => {
    const result = buildScheduleReviewPackage(scheduleReviewPackageInput);
    warnings.push(...result.warnings.map((warning) => `scheduleReviewPackageInputs[${index}]: ${warning}`));

    if (result.skipped || !result.scheduleReviewPackage) {
      skippedIndexes.push(index);
      return;
    }

    scheduleReviewPackages.push(result.scheduleReviewPackage);
  });

  return {
    scheduleReviewPackages,
    skippedIndexes,
    warnings,
  };
}
