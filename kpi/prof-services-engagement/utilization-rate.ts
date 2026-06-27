import { assertContainsProfessionalEngagementData } from "../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export const KPI_KEY = "utilization-rate";
export function compute(ctx: { containsProfessionalEngagementData?: boolean }, input: Record<string, number>) {
  assertContainsProfessionalEngagementData(ctx);
  return { kpiKey: KPI_KEY, value: (input.numerator ?? 0) / Math.max(input.denominator ?? 1, 1) };
}