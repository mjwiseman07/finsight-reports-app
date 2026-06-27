import type { ConstructionSubSegment } from "../../../industry/construction/sub-segment-classifier/types";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

const PROPORTIONATE_CONSOLIDATION_PERMITTED = new Set([
  "CONSTRUCTION:G", "CONSTRUCTION:S", "CONSTRUCTION:C",
  "CONSTRUCTION:H", "CONSTRUCTION:D", "EXTRACTIVE",
]);

export function assertProportionateConsolidationPermitted(
  industry: string,
  subSegment: ConstructionSubSegment | null,
  emitter = createConAuditEmitter(),
) {
  const key = subSegment ? `${industry}:${subSegment}` : industry;
  if (!PROPORTIONATE_CONSOLIDATION_PERMITTED.has(key)) {
    emitter.emitEscalation("CON_JV_PROPORTIONATE_REFUSED", `Refused for ${key}`);
    emitter.emitPocProgress("jv-consolidation-evaluated", { verdict: "refused", key });
    throw Object.assign(new Error("CON_JV_PROPORTIONATE_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_JV_PROPORTIONATE_REFUSED", message: key }],
    });
  }
  emitter.emitPocProgress("jv-consolidation-evaluated", { verdict: "allowed", key });
  return { allowed: true };
}

