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

export function evaluateSoc2ProcessingIntegrity(
  ctxOrInput: { containsSaaSARRData?: boolean; piTriggered?: boolean; paymentFlow?: boolean },
  input?: { piTriggered: boolean; paymentFlow?: boolean },
) {
  const legacy = input === undefined && isLegacySoc2Input(ctxOrInput) && "piTriggered" in ctxOrInput;
  const ctx = legacy ? { containsSaaSARRData: true } : ctxOrInput;
  const resolved = legacy
    ? { piTriggered: ctxOrInput.piTriggered ?? false, paymentFlow: ctxOrInput.paymentFlow }
    : input!;
  assertContainsSaaSARRData(ctx);

  if (resolved.paymentFlow && !resolved.piTriggered) {
    throw SaasViolation("SAAS_SOC2_PI_PAYMENTS", "SOC2 PI required on payment flows");
  }
  if (!resolved.piTriggered) throw SaasViolation("SAAS_SOC2_PI_BYPASS", "SOC2 PI evaluation required");
  return { evaluated: true };
}
