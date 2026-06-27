/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { evaluateIfricApr2021 } from "../../../lib/intelligence/synthetic/libraries/saas/ifrs/ifric-apr-2021";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    evaluateIfricApr2021({ containsSaaSARRData: true }, { c1: true, c2: true, c3: true, c4: true, c5: true, c6: false });
    return { id: "KV-IFRIC-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-IFRIC-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
