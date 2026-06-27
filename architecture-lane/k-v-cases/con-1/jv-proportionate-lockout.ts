/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { assertProportionateConsolidationLockout } from "../../../lib/intelligence/synthetic/libraries/construction/asc810/jv-consolidation";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

function runPoison(
  id: string,
  input: { entityType: "incorporated" | "unincorporated"; method: "equity" | "proportionate" },
) {
  try {
    assertProportionateConsolidationLockout(input);
    return { id, pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
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
