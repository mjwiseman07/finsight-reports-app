import type { SyntheticCalculationTrace } from "../types/calculation-trace";

export function buildCalculationTrace(input: SyntheticCalculationTrace): SyntheticCalculationTrace {
  return {
    id: input.id,
    moduleKey: input.moduleKey,
    metricKey: input.metricKey,
    period: input.period,
    steps: input.steps || [],
    evidenceIds: input.evidenceIds || [],
    createdAt: input.createdAt,
  };
}
