/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

export const KPI_KEY = "rpo";
export function compute(input: Record<string, number>) {
  return { kpiKey: KPI_KEY, value: input.value ?? 0 };
}
