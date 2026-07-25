/**
 * Preview Smoke Credential guard.
 *
 * Sign-in is client-side (`supabase.auth.signInWithPassword` against Supabase's
 * own /auth/v1 endpoint), so no server route ever observes the credentials and
 * there is nothing to intercept at sign-in time. Enforcement therefore happens
 * at *session acceptance*: any request carrying the smoke user's session is
 * refused unless VERCEL_ENV === 'preview'.
 *
 * Edge-safe: no Node built-ins, no service-role calls, no DB lookups.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { decodeJwtPayload } from "@/lib/mfa/paths";

/**
 * Authoritative deny-list entry. Hardcoded rather than env-only so the block
 * stays fail-closed: a missing env var in Production must not silently allow
 * the credential.
 */
export const PREVIEW_SMOKE_EMAIL = "preview-smoke@advisacor.com";

export const PREVIEW_SMOKE_REJECTION = "smoke_credential_not_allowed_outside_preview";

/** Emails treated as Preview-only smoke credentials. */
export function previewSmokeEmails(): string[] {
  const emails = [PREVIEW_SMOKE_EMAIL];
  const configured = (process.env.PREVIEW_SMOKE_EMAIL ?? "").trim().toLowerCase();
  if (configured.length > 0 && configured !== PREVIEW_SMOKE_EMAIL) {
    emails.push(configured);
  }
  return emails;
}

export function isPreviewSmokeEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return previewSmokeEmails().includes(email.trim().toLowerCase());
}

export function isPreviewEnvironment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

function decodeBase64(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function emailFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return payload?.email ?? null;
}

/**
 * Reassemble the @supabase/ssr session cookie, which is stored as
 * `sb-<ref>-auth-token` and may be chunked into `.0`, `.1`, … suffixes.
 */
function emailFromSupabaseSsrCookies(request: NextRequest): string | null {
  try {
    const parts = request.cookies
      .getAll()
      .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    if (parts.length === 0) return null;

    let raw = parts.map((c) => c.value).join("");
    if (raw.startsWith("base64-")) {
      const decoded = decodeBase64(raw.slice("base64-".length));
      if (!decoded) return null;
      raw = decoded;
    } else {
      try {
        raw = decodeURIComponent(raw);
      } catch {
        // already decoded
      }
    }

    const session = JSON.parse(raw) as {
      access_token?: string;
      user?: { email?: string };
    };
    if (session.user?.email) return session.user.email;
    if (session.access_token) return emailFromJwt(session.access_token);
    return null;
  } catch {
    return null;
  }
}

function emailFromAdvisacorCookie(request: NextRequest): string | null {
  const raw = request.cookies.get(ADVISACOR_ACCESS_TOKEN_COOKIE)?.value;
  if (!raw) return null;
  let token = raw;
  try {
    token = decodeURIComponent(raw);
  } catch {
    // already decoded
  }
  return emailFromJwt(token);
}

function emailFromBearer(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  return token ? emailFromJwt(token) : null;
}

/** Every session identity attached to this request, lowercased. */
export function requestSessionEmails(request: NextRequest): string[] {
  const found = [
    emailFromAdvisacorCookie(request),
    emailFromSupabaseSsrCookies(request),
    emailFromBearer(request),
  ];
  return found
    .filter((e): e is string => typeof e === "string" && e.length > 0)
    .map((e) => e.trim().toLowerCase());
}

export function isPreviewSmokeRequest(request: NextRequest): boolean {
  return requestSessionEmails(request).some(isPreviewSmokeEmail);
}

/**
 * Returns a 403 when the smoke credential is presented outside Preview,
 * otherwise null (request proceeds).
 */
export function enforcePreviewSmokeCredential(
  request: NextRequest,
): NextResponse | null {
  if (isPreviewEnvironment()) return null;
  if (!isPreviewSmokeRequest(request)) return null;
  return NextResponse.json({ error: PREVIEW_SMOKE_REJECTION }, { status: 403 });
}
