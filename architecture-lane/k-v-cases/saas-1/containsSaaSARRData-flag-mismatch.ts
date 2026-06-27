/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { getSaasSubSegment } from "../../../lib/intelligence/synthetic/libraries/saas/index";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    getSaasSubSegment({}, "P");
    return { id: "KV-DOCTRINE-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-DOCTRINE-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
