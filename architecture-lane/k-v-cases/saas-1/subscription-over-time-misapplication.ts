/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { evaluateSubscriptionOverTime } from "../../../lib/intelligence/synthetic/libraries/saas/asc606/subscription-over-time";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    evaluateSubscriptionOverTime({ containsSaaSARRData: true }, { c1: false, c2: false, c3: false });
    return { id: "KV-SUB-OT-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-SUB-OT-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
