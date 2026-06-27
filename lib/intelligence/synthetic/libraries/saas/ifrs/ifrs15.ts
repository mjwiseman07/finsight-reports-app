/**
 * @audit-channel arr-mrr-audit
 * @framework ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { SaasViolation } from "../errors";

export function evaluateIfrsConstraint(ctx: { containsSaaSARRData?: boolean }, input: { highlyProbable: boolean; usProbableOnly: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (input.usProbableOnly && !input.highlyProbable) {
    throw SaasViolation("SAAS_IFRS_DIV2_CONSTRAINT", "IFRS highly-probable threshold required");
  }
  return { constrained: true };
}
