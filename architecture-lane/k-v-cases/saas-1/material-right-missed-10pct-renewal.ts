/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { evaluateMaterialRight } from "../../../lib/intelligence/synthetic/libraries/saas/asc606/material-right-renewal";

export function runCase() {
  try {
    evaluateMaterialRight({ containsSaaSARRData: true }, { renewalDiscountPct: 0.12, sspReference: 100 });
    return { id: "KV-MR-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = err.escalationAudits || [];
    return {
      id: "KV-MR-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
