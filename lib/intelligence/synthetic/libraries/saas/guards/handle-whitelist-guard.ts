/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { SaasViolation } from "../errors";

export function assertHandleWhitelist(input: Record<string, unknown>) {
  if (input.handleWhitelist !== true) throw SaasViolation("SAAS_HANDLE_WHITELIST", "handleWhitelist guard failed — fail-closed");
  return true;
}
