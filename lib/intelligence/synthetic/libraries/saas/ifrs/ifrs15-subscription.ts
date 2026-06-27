/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";
export const IFRS15_SAAS_HANDLES = ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.Para56-58", "IFRS15.SubscriptionSeries"] as const;
export function resolveIfrs15SaasHandles() { return IFRS15_SAAS_HANDLES.map((h) => resolveSaasCitationHandle(h)); }
export function evaluateIfrs15Subscription(input: { highlyProbable: boolean; usProbableOnly: boolean }) {
  if (input.usProbableOnly && !input.highlyProbable) {
    throw SaasViolation("SAAS_IFRS_DIV2_CONSTRAINT", "IFRS highly-probable threshold required — not US probable");
  }
  return { constrained: true };
}
