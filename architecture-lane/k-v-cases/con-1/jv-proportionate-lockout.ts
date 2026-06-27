/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { assertProportionateConsolidationLockout } from "../../../lib/intelligence/synthetic/libraries/construction/asc810/jv-consolidation";

function runPoison(id, input) {
  try {
    assertProportionateConsolidationLockout(input);
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
    runPoison("KV-JV-1", { entityType: "incorporated", method: "proportionate" }),
    {
      id: "KV-JV-2",
      pass: assertProportionateConsolidationLockout({ entityType: "unincorporated", method: "proportionate" }).allowed === true,
      reason: "unincorporated JV allowed",
    },
  ];
}
