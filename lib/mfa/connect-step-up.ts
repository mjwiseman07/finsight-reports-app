/**
 * Dashboard accounting-connect AAL2 step-up helpers.
 * Middleware returns JSON 403 "AAL2 required" for fetch() to MFA-sensitive APIs;
 * the UI must route to /signin/mfa-challenge (page navigations already redirect).
 *
 * Resume state machine (sessionStorage; query params are never authority):
 * - idle → first AAL2: mark `pending`, MFA with resumeConnect returnTo
 * - MFA return + matching `pending`: consume pending, mark `attempt`, strip URL, call connect
 * - resume success / non-AAL2 failure: clear provider state
 * - second AAL2 while `attempt` (or resumeConnect still in URL): clear state, MFA without auto-resume
 * - forged resumeConnect without `pending`: strip URL, do not resume
 */

export const MFA_CHALLENGE_PATH = "/signin/mfa-challenge";
export const RESUME_CONNECT_PARAM = "resumeConnect";
/** Explicit reconnect / add-company start (works even when already connected). */
export const CONNECT_ACCOUNTING_PARAM = "connectAccounting";

export type ResumeConnectProvider = "quickbooks" | "xero";

const RESUME_PENDING_PREFIX = "advisacor_aal2_connect_resume_pending:";
const RESUME_ATTEMPT_PREFIX = "advisacor_aal2_connect_resume_attempt:";

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

export function buildDashboardForceConnectHref(provider: ResumeConnectProvider): string {
  return `/dashboard?${CONNECT_ACCOUNTING_PARAM}=${encodeURIComponent(provider)}`;
}

export function readResumeConnectProvider(
  search: URLSearchParams | { get: (key: string) => string | null },
): ResumeConnectProvider | null {
  const raw = String(search.get(RESUME_CONNECT_PARAM) || "").trim().toLowerCase();
  if (raw === "quickbooks" || raw === "xero") return raw;
  return null;
}

export function readForceConnectProvider(
  search: URLSearchParams | { get: (key: string) => string | null },
): ResumeConnectProvider | null {
  const raw = String(search.get(CONNECT_ACCOUNTING_PARAM) || "").trim().toLowerCase();
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

export function markConnectResumeAttempt(provider: ResumeConnectProvider): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${RESUME_ATTEMPT_PREFIX}${provider}`, "1");
}

export function hasConnectResumeAttempt(provider: ResumeConnectProvider): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(`${RESUME_ATTEMPT_PREFIX}${provider}`) === "1";
}

export function clearConnectResumeAttempt(provider: ResumeConnectProvider): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`${RESUME_ATTEMPT_PREFIX}${provider}`);
}

/** Clear pending + attempt for a provider (success, failure, or loop-break). */
export function clearConnectResumeState(provider: ResumeConnectProvider): void {
  clearConnectResumePending(provider);
  clearConnectResumeAttempt(provider);
}

/**
 * Authorized MFA-return handoff: consume matching pending and arm in-flight attempt.
 * Returns false for forged / mismatched resume queries (no pending for this provider).
 */
export function beginAuthorizedConnectResume(provider: ResumeConnectProvider): boolean {
  const hadPending = consumeConnectResumePending(provider);
  if (!hadPending) {
    clearConnectResumeAttempt(provider);
    return false;
  }
  markConnectResumeAttempt(provider);
  return true;
}

/**
 * Route an AAL2 API 403 into the MFA challenge page.
 * Returns true when navigation was triggered (caller should stop).
 *
 * Loop-safe: a second AAL2 while an MFA-return connect attempt is in flight
 * (or while resumeConnect is still on the URL) clears state and does not auto-resume.
 */
export function redirectToMfaForAccountingConnect(provider: ResumeConnectProvider): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const alreadyResuming = readResumeConnectProvider(params) === provider;
  const attemptInFlight = hasConnectResumeAttempt(provider);

  if (attemptInFlight || alreadyResuming) {
    clearConnectResumeState(provider);
    window.location.assign(buildMfaChallengeHref("/dashboard"));
    return true;
  }

  // First AAL2 (or retry after abandoned MFA): arm pending for one authorized resume.
  clearConnectResumeAttempt(provider);
  markConnectResumePending(provider);
  window.location.assign(buildMfaChallengeHref(buildDashboardResumeConnectHref(provider)));
  return true;
}
