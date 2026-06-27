/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { evaluateAmortizationMatch } from "../../../lib/intelligence/synthetic/libraries/construction/asc340-40/contract-costs";

export function runCases() {
  try {
    evaluateAmortizationMatch(100000, 150000, "milestone");
    return [{ id: "KV-340-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = err.escalationAudits || [];
    return [{
      id: "KV-340-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    }];
  }
}
