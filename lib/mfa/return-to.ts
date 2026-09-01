/**
 * Same-origin return paths for MFA challenge handoff.
 * Rejects protocol-relative, absolute, and backslash paths.
 */
export function sanitizeMfaReturnTo(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  const candidate = (raw ?? fallback).trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  if (candidate.includes("://") || candidate.includes("\\")) {
    return fallback;
  }
  return candidate;
}

export function buildMfaChallengeReturnHref(returnTo: string): string {
  const safe = sanitizeMfaReturnTo(returnTo);
  return `/signin/mfa-challenge?returnTo=${encodeURIComponent(safe)}`;
}
