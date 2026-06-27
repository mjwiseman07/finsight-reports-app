/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { evaluateIfrsConstraint } from "../../../lib/intelligence/synthetic/libraries/saas/ifrs/ifrs15";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    evaluateIfrsConstraint({ containsSaaSARRData: true }, { highlyProbable: false, usProbableOnly: true });
    return { id: "KV-IFRS-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-IFRS-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted (DIV-2)" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
