import {
  buildGenericReasonablenessBaseline,
  PHASE_42L_GENERIC_REASONABLENESS_BLUEPRINT,
  type BuildGenericReasonablenessBaselineInput,
  type SyntheticIndustryReasonableness,
} from "./buildGenericReasonablenessBaseline";

export interface BuildGenericReasonablenessBaselinesInput {
  industryReasonablenessBaselines?: BuildGenericReasonablenessBaselineInput[];
}

export interface BuildGenericReasonablenessBaselinesResult {
  industryReasonablenessBaselines: SyntheticIndustryReasonableness[];
  skippedIndexes: number[];
  warnings: string[];
}

function getBaselineInputs(
  input: BuildGenericReasonablenessBaselinesInput,
): BuildGenericReasonablenessBaselineInput[] {
  return input.industryReasonablenessBaselines ?? [...PHASE_42L_GENERIC_REASONABLENESS_BLUEPRINT];
}

export function buildGenericReasonablenessBaselines(
  input: BuildGenericReasonablenessBaselinesInput,
): BuildGenericReasonablenessBaselinesResult {
  const industryReasonablenessBaselines: SyntheticIndustryReasonableness[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const baselineInputs = getBaselineInputs(input);

  baselineInputs.forEach((baselineInput, index) => {
    const result = buildGenericReasonablenessBaseline({
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
