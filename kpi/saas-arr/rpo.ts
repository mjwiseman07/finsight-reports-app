/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";

export const KPI_KEY = "rpo";
export function compute(ctx: { containsSaaSARRData?: boolean }, input: Record<string, number>) {
  assertContainsSaaSARRData(ctx);

  return { kpiKey: KPI_KEY, value: input.value ?? 0 };
}
