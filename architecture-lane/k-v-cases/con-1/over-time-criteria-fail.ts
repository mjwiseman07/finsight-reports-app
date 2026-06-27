/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { evaluateOverTimeCriteria } from "../../../lib/intelligence/synthetic/libraries/construction/asc606/over-time-criteria";

function runPoison(id, criteria) {
  try {
    evaluateOverTimeCriteria(criteria);
    return { id, pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = err.escalationAudits || [];
    return {
      id,
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}

export function runCases() {
  return [
    runPoison("KV-OT-1", { c1: false, c2: false, c3: false }),
    runPoison("KV-OT-2", { c1: false, c2: false, c3: false }),
    {
      id: "KV-OT-3",
      pass: evaluateOverTimeCriteria({ c1: true, c2: false, c3: false }).pass === true,
      reason: "single criterion pass",
    },
  ];
}
