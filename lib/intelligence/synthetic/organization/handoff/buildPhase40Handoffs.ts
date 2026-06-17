import {
  buildPhase40Handoff,
  type BuildPhase40HandoffInput,
  type SyntheticPhase40Handoff,
} from "./buildPhase40Handoff";

export interface BuildPhase40HandoffsInput {
  phase40HandoffInputs?: BuildPhase40HandoffInput[];
}

export interface BuildPhase40HandoffsResult {
  phase40Handoffs: SyntheticPhase40Handoff[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildPhase40Handoffs(input: BuildPhase40HandoffsInput): BuildPhase40HandoffsResult {
  const phase40Handoffs: SyntheticPhase40Handoff[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.phase40HandoffInputs).forEach((handoffInput, index) => {
    const result = buildPhase40Handoff(handoffInput);

    warnings.push(...result.warnings.map((warning) => `phase40Handoff[${index}]: ${warning}`));

    if (result.skipped || !result.phase40Handoff) {
      skippedIndexes.push(index);
      return;
    }

    phase40Handoffs.push(result.phase40Handoff);
  });

  return {
    phase40Handoffs,
    skippedIndexes,
    warnings,
  };
}
