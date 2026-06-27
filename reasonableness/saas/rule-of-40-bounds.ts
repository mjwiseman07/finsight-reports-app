/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export const BENCHMARK_HANDLE = "Bessemer.RuleOf40";
export function bounds(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return { handle: BENCHMARK_HANDLE, source: "SaaS_Benchmarks_Sources.md" };
}