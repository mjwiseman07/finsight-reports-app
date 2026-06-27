/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { switchSaasFramework } from "../../../lib/intelligence/synthetic/libraries/saas/frameworks/k-f-switch";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    switchSaasFramework({ containsSaaSARRData: true, framework: "US_GAAP" }, "KF-1");
    return { id: "KV-KF-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-KF-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
