/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { SaasViolation } from "../errors";

export function assertContainsSaaSARRData(input: Record<string, unknown>) {
  if (input.containsSaaSARRData !== true) throw SaasViolation("SAAS_ARR_DATA_GUARD", "containsSaaSARRData guard failed — fail-closed");
  return true;
}
