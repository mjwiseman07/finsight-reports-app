import {
  buildDigitalDepartment,
  type BuildDigitalDepartmentInput,
  type SyntheticDigitalDepartment,
} from "./buildDigitalDepartment";

export interface BuildDigitalDepartmentsInput {
  digitalDepartmentInputs?: BuildDigitalDepartmentInput[];
}

export interface BuildDigitalDepartmentsResult {
  digitalDepartments: SyntheticDigitalDepartment[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildDigitalDepartments(input: BuildDigitalDepartmentsInput): BuildDigitalDepartmentsResult {
  const digitalDepartments: SyntheticDigitalDepartment[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.digitalDepartmentInputs).forEach((departmentInput, index) => {
    const result = buildDigitalDepartment(departmentInput);

    warnings.push(...result.warnings.map((warning) => `digitalDepartment[${index}]: ${warning}`));

    if (result.skipped || !result.digitalDepartment) {
      skippedIndexes.push(index);
      return;
    }

    digitalDepartments.push(result.digitalDepartment);
  });

  return {
    digitalDepartments,
    skippedIndexes,
    warnings,
  };
}
