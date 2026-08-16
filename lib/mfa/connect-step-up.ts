/**
 * Dashboard accounting-connect AAL2 step-up helpers.
 * Middleware returns JSON 403 "AAL2 required" for fetch() to MFA-sensitive APIs;
 * the UI must route to /signin/mfa-challenge (page navigations already redirect).
 */

export const MFA_CHALLENGE_PATH = "/signin/mfa-challenge";
export const RESUME_CONNECT_PARAM = "resumeConnect";

export type ResumeConnectProvider = "quickbooks" | "xero";

const RESUME_PENDING_PREFIX = "advisacor_aal2_connect_resume_pending:";

export function isAal2RequiredApiError(
  response: { status: number },
  body: { error?: unknown } | null | undefined,
): boolean {
  if (response.status !== 403) return false;
  return /aal2\s+required/i.test(String(body?.error || ""));
}

export function buildMfaChallengeHref(returnTo: string): string {
  const safe = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
  return `${MFA_CHALLENGE_PATH}?returnTo=${encodeURIComponent(safe)}`;
}

export function buildDashboardResumeConnectHref(provider: ResumeConnectProvider): string {
  return `/dashboard?${RESUME_CONNECT_PARAM}=${encodeURIComponent(provider)}`;
}

export function readResumeConnectProvider(
  search: URLSearchParams | { get: (key: string) => string | null },
): ResumeConnectProvider | null {
  const raw = String(search.get(RESUME_CONNECT_PARAM) || "").trim().toLowerCase();
  if (raw === "quickbooks" || raw === "xero") return raw;
  return null;
}

export function markConnectResumePending(provider: ResumeConnectProvider): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${RESUME_PENDING_PREFIX}${provider}`, "1");
}

export function consumeConnectResumePending(provider: ResumeConnectProvider): boolean {
  if (typeof window === "undefined") return false;
  const key = `${RESUME_PENDING_PREFIX}${provider}`;
  const pending = window.sessionStorage.getItem(key) === "1";
  window.sessionStorage.removeItem(key);
  return pending;
}

export function clearConnectResumePending(provider: ResumeConnectProvider): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`${RESUME_PENDING_PREFIX}${provider}`);
}

/**
 * Route an AAL2 API 403 into the MFA challenge page.
 * Returns true when navigation was triggered (caller should stop).
 * Loop-safe: a second AAL2 while already resuming sends to MFA without auto-resume.
 */
export function redirectToMfaForAccountingConnect(provider: ResumeConnectProvider): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const alreadyResuming = readResumeConnectProvider(params) === provider;
  const pending = window.sessionStorage.getItem(`${RESUME_PENDING_PREFIX}${provider}`) === "1";

  if (alreadyResuming || pending) {
    clearConnectResumePending(provider);
    window.location.assign(buildMfaChallengeHref("/dashboard"));
    return true;
  }

  markConnectResumePending(provider);
  window.location.assign(buildMfaChallengeHref(buildDashboardResumeConnectHref(provider)));
  return true;
}
