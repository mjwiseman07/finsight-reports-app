/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

export const BENCHMARK_HANDLE = "OpenView.SaaSIndex";
export function getRange() { return { handle: BENCHMARK_HANDLE, source: "SaaS_Benchmarks_Sources.md" }; }
