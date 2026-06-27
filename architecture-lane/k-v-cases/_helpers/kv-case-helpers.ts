export type EscalationAuditRecord = {
  channel: string;
  code: string;
  message: string;
};

/** P5: narrow unknown catch bindings for K-V poison runners */
export function extractEscalationAudits(err: unknown): EscalationAuditRecord[] {
  if (err !== null && typeof err === "object" && "escalationAudits" in err) {
    const audits = (err as { escalationAudits?: unknown }).escalationAudits;
    return Array.isArray(audits) ? (audits as EscalationAuditRecord[]) : [];
  }
  return [];
}

export const PROF_SERVICES_KV_CTX = { containsProfessionalEngagementData: true as const };
