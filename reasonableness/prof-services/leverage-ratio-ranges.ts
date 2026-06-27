/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */

export const BENCHMARK_HANDLE = "Rosenberg.Leverage";
export function getRange() { return { handle: BENCHMARK_HANDLE, source: "Prof_Services_Benchmarks_Sources.md" }; }
