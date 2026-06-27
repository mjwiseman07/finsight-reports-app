/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { classifySaasSubSegment } from "../../../lib/intelligence/synthetic/libraries/saas/classifiers/saas-sub-segment-classifier";

export function runCase() {
  try {
    classifySaasSubSegment({ containsSaaSARRData: true, naicsCode: "511210" });
    return { id: "KV-SEG-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = err.escalationAudits || [];
    return {
      id: "KV-SEG-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit on ambiguity" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
