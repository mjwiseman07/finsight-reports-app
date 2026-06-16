import {
  buildOvernightSchedule,
  type BuildOvernightScheduleInput,
  type SyntheticOvernightSchedule,
} from "./buildOvernightSchedule";

export interface BuildOvernightSchedulesInput {
  items: BuildOvernightScheduleInput[];
}

export interface BuildOvernightSchedulesResult {
  overnightSchedules: SyntheticOvernightSchedule[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOvernightSchedules(input: BuildOvernightSchedulesInput): BuildOvernightSchedulesResult {
  const overnightSchedules: SyntheticOvernightSchedule[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildOvernightSchedule(item);

    if (result.overnightSchedule) {
      overnightSchedules.push(result.overnightSchedule);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `overnightSchedules[${index}]: ${warning}`));
  });

  return {
    overnightSchedules,
    skippedIndexes,
    warnings,
  };
}
