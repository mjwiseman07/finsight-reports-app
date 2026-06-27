/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

export type SaasCitationLibrary = "ASC_606_340" | "ASC_985_350" | "SPECIALIZED" | "IFRS" | "BENCHMARKS";
export type SaasSubSegmentId = "P" | "H" | "U" | "F" | "V";
export interface SaasCitationHandle { handleId: string; library: SaasCitationLibrary; url: string; }
export interface SaasSubSegmentKernel {
  subSegmentId: SaasSubSegmentId;
  name: string;
  frameworks: ("US_GAAP" | "IFRS")[];
}
