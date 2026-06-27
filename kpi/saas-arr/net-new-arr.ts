/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

export const KPI_KEY = "net-new-arr";
export function compute(input: Record<string, number>) {
  return { kpiKey: KPI_KEY, value: (input.numerator ?? 0) / Math.max(input.denominator ?? 1, 1) };
}