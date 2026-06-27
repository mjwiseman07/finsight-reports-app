import { assertContainsConstructionContractData } from "../lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData";
export const KPI_KEY = "aging-buckets";
export function compute(ctx: { containsConstructionContractData?: boolean }, input: Record<string, number>) {
  assertContainsConstructionContractData(ctx);
  return { kpiKey: KPI_KEY, value: (input.numerator ?? 0) / Math.max(input.denominator ?? 1, 1) };
}