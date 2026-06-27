/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { evaluateSoc2ProcessingIntegrity } from "../../../lib/intelligence/synthetic/libraries/saas/specialized/soc2/processing-integrity";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    evaluateSoc2ProcessingIntegrity({ piTriggered: false, paymentFlow: true });
    return { id: "KV-SOC2-PI-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-SOC2-PI-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
