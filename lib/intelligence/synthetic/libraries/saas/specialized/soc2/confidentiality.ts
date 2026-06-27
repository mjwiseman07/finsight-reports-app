/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { SaasViolation } from "../../errors";

export function evaluateSoc2Confidentiality(ctx: { containsSaaSARRData?: boolean }, input: { cEvaluated: boolean }) {
  assertContainsSaaSARRData(ctx);

  if (!input.cEvaluated) throw SaasViolation("SAAS_SOC2_C_BYPASS", "SOC2 C evaluation required");
  return { evaluated: true };
}
