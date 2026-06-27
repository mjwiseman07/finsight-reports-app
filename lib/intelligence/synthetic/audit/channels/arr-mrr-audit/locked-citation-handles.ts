import { SAAS_CITATION_HANDLE_REGISTRY } from "../../../libraries/saas/handles-registry.generated";

export const SAAS2_LOCKED_CITATION_HANDLES = new Set(Object.keys(SAAS_CITATION_HANDLE_REGISTRY));

export function assertSaasCitationHandleLocked(handleId: string): void {
  if (!SAAS2_LOCKED_CITATION_HANDLES.has(handleId)) {
    throw Object.assign(new Error(`Handle not whitelisted: ${handleId}`), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_HANDLE_NOT_WHITELISTED", message: handleId }],
    });
  }
}
