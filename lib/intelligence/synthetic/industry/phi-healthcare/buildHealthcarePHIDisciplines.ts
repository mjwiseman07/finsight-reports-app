import {
  buildHealthcarePHIDiscipline,
  PHASE_42Q_HEALTHCARE_PHI_DISCIPLINE_BLUEPRINT,
  type BuildHealthcarePHIDisciplineInput,
  type SyntheticHealthcarePHIDiscipline,
} from "./buildHealthcarePHIDiscipline";

export interface BuildHealthcarePHIDisciplinesInput {
  healthcarePhiDisciplines?: BuildHealthcarePHIDisciplineInput[];
}

export interface BuildHealthcarePHIDisciplinesResult {
  healthcarePhiDisciplines: SyntheticHealthcarePHIDiscipline[];
  skippedIndexes: number[];
  warnings: string[];
}

function getDisciplineInputs(
  input: BuildHealthcarePHIDisciplinesInput,
): BuildHealthcarePHIDisciplineInput[] {
  return input.healthcarePhiDisciplines ?? [...PHASE_42Q_HEALTHCARE_PHI_DISCIPLINE_BLUEPRINT];
}

export function buildHealthcarePHIDisciplines(
  input: BuildHealthcarePHIDisciplinesInput,
): BuildHealthcarePHIDisciplinesResult {
  const healthcarePhiDisciplines: SyntheticHealthcarePHIDiscipline[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];
  const disciplineInputs = getDisciplineInputs(input);

  disciplineInputs.forEach((disciplineInput, index) => {
    const result = buildHealthcarePHIDiscipline({
      ...disciplineInput,
      skippedIndexes: [...(disciplineInput.skippedIndexes ?? []), index],
    });

    if (result.healthcarePhiDiscipline) {
      healthcarePhiDisciplines.push(result.healthcarePhiDiscipline);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `healthcarePhiDiscipline[${index}]: ${warning}`),
    );
  });

  return {
    healthcarePhiDisciplines,
    skippedIndexes,
    warnings,
  };
}
