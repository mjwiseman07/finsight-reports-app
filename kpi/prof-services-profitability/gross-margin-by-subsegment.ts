/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */

export const KPI_KEY = "gross-margin-by-subsegment";
export function compute(input: Record<string, number>) {
  return { kpiKey: KPI_KEY, value: (input.numerator ?? 0) / Math.max(input.denominator ?? 1, 1) };
}