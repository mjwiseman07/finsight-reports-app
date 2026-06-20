import {
  buildHealthcareReasonablenessBenchmark,
  PHASE_42P_HEALTHCARE_REASONABLENESS_BENCHMARK_BLUEPRINT,
  type BuildHealthcareReasonablenessBenchmarkInput,
  type SyntheticHealthcareReasonablenessBenchmark,
} from "./buildHealthcareReasonablenessBenchmark";

export interface BuildHealthcareReasonablenessBenchmarksInput {
  industryReasonablenessBenchmarks?: BuildHealthcareReasonablenessBenchmarkInput[];
}

export interface BuildHealthcareReasonablenessBenchmarksResult {
  industryReasonablenessBenchmarks: SyntheticHealthcareReasonablenessBenchmark[];
  skippedIndexes: number[];
  warnings: string[];
}

function getBenchmarkInputs(
  input: BuildHealthcareReasonablenessBenchmarksInput,
): BuildHealthcareReasonablenessBenchmarkInput[] {
  return (
    input.industryReasonablenessBenchmarks ?? [...PHASE_42P_HEALTHCARE_REASONABLENESS_BENCHMARK_BLUEPRINT]
  );
}

export function buildHealthcareReasonablenessBenchmarks(
  input: BuildHealthcareReasonablenessBenchmarksInput,
): BuildHealthcareReasonablenessBenchmarksResult {
  const industryReasonablenessBenchmarks: SyntheticHealthcareReasonablenessBenchmark[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const benchmarkInputs = getBenchmarkInputs(input);

  benchmarkInputs.forEach((benchmarkInput, index) => {
    const result = buildHealthcareReasonablenessBenchmark({
      ...benchmarkInput,
      skippedIndexes: [...(benchmarkInput.skippedIndexes ?? []), index],
    });

    if (result.industryReasonablenessBenchmark) {
      industryReasonablenessBenchmarks.push(result.industryReasonablenessBenchmark);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map(
        (warning) => `industryReasonablenessBenchmark[${index}]: ${warning}`,
      ),
    );
  });

  return {
    industryReasonablenessBenchmarks,
    skippedIndexes,
    warnings,
  };
}
