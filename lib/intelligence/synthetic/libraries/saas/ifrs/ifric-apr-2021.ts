/**
 * @audit-channel arr-mrr-audit
 * @framework ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { SaasViolation } from "../errors";

export function evaluateIfricApr2021(ctx: { containsSaaSARRData?: boolean }, criteria: { c1: boolean; c2: boolean; c3: boolean; c4: boolean; c5: boolean; c6: boolean }) {
  assertContainsSaaSARRData(ctx);
  const all = [criteria.c1, criteria.c2, criteria.c3, criteria.c4, criteria.c5, criteria.c6];
  if (all.filter(Boolean).length < 6) {
    throw SaasViolation("SAAS_IFRIC_APR2021_INCOMPLETE", "IFRIC Apr 2021 requires all six criteria");
  }
  return { saasHosting: true };
}
