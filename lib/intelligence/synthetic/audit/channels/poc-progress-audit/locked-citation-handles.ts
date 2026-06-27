import { CONSTRUCTION_CITATION_HANDLE_REGISTRY } from "../../../libraries/construction/handles-registry.generated";

export const CON2_LOCKED_CITATION_HANDLES = new Set(Object.keys(CONSTRUCTION_CITATION_HANDLE_REGISTRY));

export function assertConCitationHandleLocked(handleId: string): void {
  if (!CON2_LOCKED_CITATION_HANDLES.has(handleId)) {
    throw Object.assign(new Error(`Handle not whitelisted: ${handleId}`), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_HANDLE_NOT_WHITELISTED", message: handleId }],
    });
  }
}
