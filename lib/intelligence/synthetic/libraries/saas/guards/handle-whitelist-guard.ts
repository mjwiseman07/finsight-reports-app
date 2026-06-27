/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { SaasViolation } from "../errors";

export function assertHandleWhitelist(ctx: { containsSaaSARRData?: boolean }, input: Record<string, unknown>) {
  assertContainsSaaSARRData(ctx);

  if (input.handleWhitelist !== true) throw SaasViolation("SAAS_HANDLE_WHITELIST", "handleWhitelist guard failed — fail-closed");
  return true;
}
