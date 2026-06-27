/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { evaluateCommissionAmortization } from "../../../lib/intelligence/synthetic/libraries/saas/asc606/commission-amortization";

export function runCase() {
  try {
    evaluateCommissionAmortization({ containsSaaSARRData: true }, { contractTermOnly: true, expectedRenewals: 2 });
    return { id: "KV-COMM-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = err.escalationAudits || [];
    return {
      id: "KV-COMM-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
