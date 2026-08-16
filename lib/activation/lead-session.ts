/**
 * Free-review lead UX helpers (localStorage/URL hints only).
 * Dashboard lead AUTHORITY is established only by GET /api/free-review/session
 * using the HttpOnly free_review_lead_id cookie + live free_review_leads row.
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
  serverValidated?: boolean;
  [key: string]: unknown;
};

const PLACEHOLDER_COMPANY_NAMES = new Set(
  [
    "not provided",
    "free review company",
    "quickbooks company",
    "xero organization",
    "industry intelligence",
  ].map((s) => s.toLowerCase()),
);

export function isUsableCompanyName(value: string | null | undefined): boolean {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_COMPANY_NAMES.has(trimmed.toLowerCase());
}

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
 * Persist URL leadId as a UX hint only. Never grants dashboard access.
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
    serverValidated: false,
  };
  storage.setItem(LEAD_ID_KEY, leadId);
  storage.setItem(LEAD_SESSION_KEY, JSON.stringify(next));
  return leadId;
}

export function rememberValidatedLeadSession(
  lead: { lead_id: string; business_name?: string | null },
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage || !lead?.lead_id) return;
  const existing = readLeadSessionFromStorage(storage) || ({} as Partial<LeadSessionRecord>);
  storage.setItem(LEAD_ID_KEY, lead.lead_id);
  storage.setItem(
    LEAD_SESSION_KEY,
    JSON.stringify({
      ...existing,
      leadId: lead.lead_id,
      companyName: lead.business_name || existing.companyName,
      capturedAt: new Date().toISOString(),
      source: "server_validated",
      serverValidated: true,
    }),
  );
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
