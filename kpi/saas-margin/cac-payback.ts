import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export const KPI_KEY = "cac-payback";
export function compute(ctx: { containsSaaSARRData?: boolean }, input: Record<string, number>) {
  assertContainsSaaSARRData(ctx);
  return { kpiKey: KPI_KEY, value: (input.numerator ?? input.value ?? 0) / Math.max(input.denominator ?? 1, 1) };
}