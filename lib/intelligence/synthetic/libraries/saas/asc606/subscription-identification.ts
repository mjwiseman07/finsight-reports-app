/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.606-10-25-1", "ASC.606-10-25-14", "ASC.606-10-25-15"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function evaluateSubscriptionIdentification(input: { distinctSeries: boolean; subscriptionTermMonths: number }) {
  if (!input.distinctSeries) throw SaasViolation("SAAS_SUBSCRIPTION_NO_SERIES", "Subscription without series-of-distinct — fail-closed");
  return { identified: true, termMonths: input.subscriptionTermMonths };
}
