/**
 * Free-review lead session bootstrap for dashboard-first activation.
 * Writes lead context to localStorage so the existing dashboard access gate
 * (`lead_free_review`) can authorize lead-safe capabilities — without mounting
 * product UI first, and without treating localStorage as a general auth token.
 */

export const LEAD_SESSION_KEY = "advisacor_lead_dashboard_session";
export const LEAD_ID_KEY = "advisacor_free_review_lead_id";

export type LeadSessionRecord = {
  leadId: string;
  capturedAt: string;
  source?: string;
  companyName?: string;
  packageLevel?: string;
  accountingProvider?: string;
  [key: string]: unknown;
};

export function readLeadSessionFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof window !== "undefined" ? window.localStorage : null,
): LeadSessionRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(LEAD_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const leadId = String((parsed as LeadSessionRecord).leadId || "").trim();
    if (!leadId) return null;
    return { ...(parsed as LeadSessionRecord), leadId };
  } catch {
    return null;
  }
}

/**
 * If the URL carries leadId, persist lead session keys then return the leadId.
 * Does not grant dashboard access by itself — callers must still run the
 * existing lead_free_review / auth access gate.
 */
export function bootstrapLeadSessionFromSearchParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null,
): string | null {
  const leadId = String(searchParams.get("leadId") || "").trim();
  if (!leadId || !storage) return null;

  const existing = readLeadSessionFromStorage(storage) || ({} as Partial<LeadSessionRecord>);
  const next: LeadSessionRecord = {
    ...existing,
    leadId,
    capturedAt: new Date().toISOString(),
    source: existing.source || "dashboard_activation",
  };
  storage.setItem(LEAD_ID_KEY, leadId);
  storage.setItem(LEAD_SESSION_KEY, JSON.stringify(next));
  return leadId;
}

/** Scope optional activation dismissal so Company A prefs do not leak to Company B. */
export function activationDismissStorageKey(scope: {
  companyId?: string | null;
  leadId?: string | null;
}): string {
  const companyId = String(scope.companyId || "").trim();
  const leadId = String(scope.leadId || "").trim();
  if (companyId) return `advisacor_dashboard_activation_dismissed_v1:company:${companyId}`;
  if (leadId) return `advisacor_dashboard_activation_dismissed_v1:lead:${leadId}`;
  return "advisacor_dashboard_activation_dismissed_v1:unscoped";
}
