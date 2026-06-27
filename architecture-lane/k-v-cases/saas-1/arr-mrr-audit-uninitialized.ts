/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { FileArrMrrAuditWriter } from "../../../lib/intelligence/synthetic/audit/channels/arr-mrr-audit/writer";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  const writer = Object.create(FileArrMrrAuditWriter.prototype);
  writer.initialized = false;
  try {
    writer.append("arr-evaluated", { value: 1 });
    return { id: "KV-AUDIT-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-AUDIT-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
