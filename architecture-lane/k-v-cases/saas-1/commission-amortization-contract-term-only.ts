/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { evaluateCommissionAmortization } from "../../../lib/intelligence/synthetic/libraries/saas/asc606/commission-amortization";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    evaluateCommissionAmortization({ containsSaaSARRData: true }, { contractTermOnly: true, expectedRenewals: 2 });
    return { id: "KV-COMM-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-COMM-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
