import type { SyntheticCalculationStep } from "../types/calculation-trace";

export function buildCalculationStep(input: SyntheticCalculationStep): SyntheticCalculationStep {
  return {
    stepId: input.stepId,
    label: input.label,
    formulaRef: input.formulaRef,
    inputs: input.inputs || [],
    outputs: input.outputs || [],
    warnings: input.warnings || [],
  };
}
