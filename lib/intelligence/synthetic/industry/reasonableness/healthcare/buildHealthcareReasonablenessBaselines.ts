import {
  buildHealthcareReasonablenessBaseline,
  PHASE_42P_HEALTHCARE_REASONABLENESS_BLUEPRINT,
  type BuildHealthcareReasonablenessBaselineInput,
  type SyntheticIndustryReasonableness,
} from "./buildHealthcareReasonablenessBaseline";

export interface BuildHealthcareReasonablenessBaselinesInput {
  industryReasonablenessBaselines?: BuildHealthcareReasonablenessBaselineInput[];
}

export interface BuildHealthcareReasonablenessBaselinesResult {
  industryReasonablenessBaselines: SyntheticIndustryReasonableness[];
  skippedIndexes: number[];
  warnings: string[];
}

function getBaselineInputs(
  input: BuildHealthcareReasonablenessBaselinesInput,
): BuildHealthcareReasonablenessBaselineInput[] {
  return input.industryReasonablenessBaselines ?? [...PHASE_42P_HEALTHCARE_REASONABLENESS_BLUEPRINT];
}

export function buildHealthcareReasonablenessBaselines(
  input: BuildHealthcareReasonablenessBaselinesInput,
): BuildHealthcareReasonablenessBaselinesResult {
  const industryReasonablenessBaselines: SyntheticIndustryReasonableness[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const baselineInputs = getBaselineInputs(input);

  baselineInputs.forEach((baselineInput, index) => {
    const result = buildHealthcareReasonablenessBaseline({
      ...baselineInput,
      skippedIndexes: [...(baselineInput.skippedIndexes ?? []), index],
    });

    if (result.industryReasonableness) {
      industryReasonablenessBaselines.push(result.industryReasonableness);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `industryReasonableness[${index}]: ${warning}`),
    );
  });

  return {
    industryReasonablenessBaselines,
    skippedIndexes,
    warnings,
  };
}
