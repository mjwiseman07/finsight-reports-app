/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../../standards/doctrine/containsSaaSARRData";

import { SaasViolation } from "../../errors";

function isLegacySoc2Input(input: { containsSaaSARRData?: boolean }) {
  return input.containsSaaSARRData === undefined;
}

export function evaluateSoc2CommonCriteria(
  ctxOrInput: { containsSaaSARRData?: boolean; ccEvaluated?: boolean },
  input?: { ccEvaluated: boolean },
) {
  const legacy = input === undefined && isLegacySoc2Input(ctxOrInput) && "ccEvaluated" in ctxOrInput;
  const ctx = legacy ? { containsSaaSARRData: true } : ctxOrInput;
  const resolved = legacy ? { ccEvaluated: ctxOrInput.ccEvaluated ?? false } : input!;
  assertContainsSaaSARRData(ctx);

  if (!resolved.ccEvaluated) throw SaasViolation("SAAS_SOC2_CC_BYPASS", "SOC2 CC evaluation required");
  return { evaluated: true };
}
