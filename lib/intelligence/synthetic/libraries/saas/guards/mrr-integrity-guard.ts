/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { SaasViolation } from "../errors";

export function assertMrrIntegrity(ctx: { containsSaaSARRData?: boolean }, input: Record<string, unknown>) {
  assertContainsSaaSARRData(ctx);

  if (input.mrrIntegrity !== true) throw SaasViolation("SAAS_MRR_INTEGRITY_GUARD", "mrrIntegrity guard failed — fail-closed");
  return true;
}
