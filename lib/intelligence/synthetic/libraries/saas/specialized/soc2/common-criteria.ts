/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { SaasViolation } from "../../errors";

export function evaluateSoc2CommonCriteria(ctx: { containsSaaSARRData?: boolean }, input: { ccEvaluated: boolean }) {
  assertContainsSaaSARRData(ctx);

  if (!input.ccEvaluated) throw SaasViolation("SAAS_SOC2_CC_BYPASS", "SOC2 CC evaluation required");
  return { evaluated: true };
}
