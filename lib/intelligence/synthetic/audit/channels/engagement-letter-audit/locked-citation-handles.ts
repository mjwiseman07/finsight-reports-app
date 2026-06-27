import { PROF_SERVICES_CITATION_HANDLE_REGISTRY } from "../../../libraries/prof-services/handles-registry.generated";

export const PS2_LOCKED_CITATION_HANDLES = new Set(Object.keys(PROF_SERVICES_CITATION_HANDLE_REGISTRY));

export function assertPsCitationHandleLocked(handleId: string): void {
  if (!PS2_LOCKED_CITATION_HANDLES.has(handleId)) {
    throw Object.assign(new Error(`Handle not whitelisted: ${handleId}`), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_HANDLE_NOT_WHITELISTED", message: handleId }],
    });
  }
}
