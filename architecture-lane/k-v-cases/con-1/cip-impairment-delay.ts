/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { evaluateCipImpairmentDelay } from "../../../lib/intelligence/synthetic/libraries/construction/asc360/cip-impairment";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCases() {
  try {
    evaluateCipImpairmentDelay(true, true);
    return [{ id: "KV-CIP-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return [{
      id: "KV-CIP-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    }];
  }
}
