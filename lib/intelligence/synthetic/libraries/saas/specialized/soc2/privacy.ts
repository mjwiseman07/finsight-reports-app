/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../../standards/doctrine/containsSaaSARRData";

import { SaasViolation } from "../../errors";

export function evaluateSoc2Privacy(ctx: { containsSaaSARRData?: boolean }, input: { pEvaluated: boolean }) {
  assertContainsSaaSARRData(ctx);

  if (!input.pEvaluated) throw SaasViolation("SAAS_SOC2_P_BYPASS", "SOC2 P evaluation required");
  return { evaluated: true };
}
