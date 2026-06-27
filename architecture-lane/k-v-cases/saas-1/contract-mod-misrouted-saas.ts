/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { routeSaasContractModification } from "../../../lib/intelligence/synthetic/libraries/saas/asc606/contract-mods";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    routeSaasContractModification({ containsSaaSARRData: true }, { separateContract: true, remainingDistinct: false, saasContext: false });
    return { id: "KV-MOD-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-MOD-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
