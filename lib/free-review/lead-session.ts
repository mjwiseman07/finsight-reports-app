/**
 * Free Review opaque lead sessions.
 *
 * Contract:
 * - Cookie `free_review_lead_session` holds only a cryptographically random opaque token.
 * - Server stores SHA-256(token) hex in `free_review_lead_sessions.token_hash`.
 * - Lead UUID from body/query/URL/localStorage/legacy cookie never authenticates.
 * - Active session requires: unrevoked, unexpired, lead status not inactive.
 * - Bearer and session cookie: invalid bearer fails closed (no cookie fallback).
 *   Valid bearer takes precedence; both present with valid bearer is bearer-wins
 *   (documented). Conflicting claimed lead identity vs resolved session fails closed.
 */
import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const LEAD_SESSION_COOKIE = "free_review_lead_session";
/** Legacy capability cookie — always expire; never authorize. */
export const LEGACY_LEAD_ID_COOKIE = "free_review_lead_id";

/** Narrow path: Free Review + accounting + provider connect APIs. */
export const LEAD_SESSION_COOKIE_PATH = "/api";

export const LEAD_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const INACTIVE_LEAD_STATUSES = new Set([
  "cancelled",
  "canceled",
  "expired",
  "revoked",
  "closed",
  "rejected",
  "inactive",
]);

/** UUID v4-ish — used to reject legacy raw lead-id cookie values. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LeadSessionRecord = {
  sessionId: string;
  leadId: string;
  leadStatus: string;
};

export function hashLeadSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateLeadSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isInactiveLeadStatus(status: string | null | undefined): boolean {
  return INACTIVE_LEAD_STATUSES.has(String(status || "").trim().toLowerCase());
}

export function looksLikeLegacyLeadIdCookie(value: string): boolean {
  return UUID_RE.test(String(value || "").trim());
}

export function leadSessionCookieOptions(maxAgeSeconds = LEAD_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: LEAD_SESSION_COOKIE_PATH,
    maxAge: maxAgeSeconds,
    // host-only: do not set Domain
  };
}

export function clearLeadAuthCookies(response: NextResponse): void {
  response.cookies.set(LEAD_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: LEAD_SESSION_COOKIE_PATH,
    maxAge: 0,
  });
  // Expire legacy cookie on both historical and current paths.
  for (const path of ["/", LEAD_SESSION_COOKIE_PATH]) {
    response.cookies.set(LEGACY_LEAD_ID_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path,
      maxAge: 0,
    });
  }
}

export function setLeadSessionCookie(response: NextResponse, token: string): void {
  clearLeadAuthCookies(response);
  response.cookies.set(LEAD_SESSION_COOKIE, token, leadSessionCookieOptions());
}

function readCookieHeader(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return String(match[1]).trim();
  }
}

export function readLeadSessionTokenFromRequest(request: Request): string {
  // Prefer NextRequest cookies when available.
  const anyReq = request as Request & {
    cookies?: { get?: (n: string) => { value?: string } | undefined };
  };
  const fromApi = String(anyReq.cookies?.get?.(LEAD_SESSION_COOKIE)?.value || "").trim();
  if (fromApi) return fromApi;
  return readCookieHeader(request, LEAD_SESSION_COOKIE);
}

export function readLegacyLeadIdCookie(request: Request): string {
  const anyReq = request as Request & {
    cookies?: { get?: (n: string) => { value?: string } | undefined };
  };
  const fromApi = String(anyReq.cookies?.get?.(LEGACY_LEAD_ID_COOKIE)?.value || "").trim();
  if (fromApi) return fromApi;
  return readCookieHeader(request, LEGACY_LEAD_ID_COOKIE);
}

/**
 * Create a new session for a lead; revoke prior active sessions (rotation).
 * Returns the opaque token once (never log it).
 */
export async function issueLeadSession(args: {
  leadId: string;
  replaceSessionId?: string | null;
}): Promise<{ token: string; sessionId: string; expiresAt: string }> {
  if (!supabaseAdmin) throw new Error("supabase_admin_unavailable");

  const token = generateLeadSessionToken();
  const tokenHash = hashLeadSessionToken(token);
  const expiresAt = new Date(Date.now() + LEAD_SESSION_TTL_SECONDS * 1000).toISOString();

  const { data: created, error: insertError } = await supabaseAdmin
    .from("free_review_lead_sessions")
    .insert({
      lead_id: args.leadId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !created?.id) {
    throw new Error("lead_session_issue_failed");
  }

  const sessionId = created.id as string;

  // Revoke other active sessions for this lead (rotation / replace).
  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from("free_review_lead_sessions")
    .update({
      revoked_at: nowIso,
      replaced_by_session_id: sessionId,
    })
    .eq("lead_id", args.leadId)
    .is("revoked_at", null)
    .neq("id", sessionId);

  if (args.replaceSessionId) {
    await supabaseAdmin
      .from("free_review_lead_sessions")
      .update({
        revoked_at: nowIso,
        replaced_by_session_id: sessionId,
      })
      .eq("id", args.replaceSessionId)
      .is("revoked_at", null);
  }

  return { token, sessionId, expiresAt };
}

export async function resolveLeadSessionFromToken(
  token: string,
): Promise<LeadSessionRecord | null> {
  if (!supabaseAdmin) return null;
  const trimmed = String(token || "").trim();
  if (!trimmed) return null;

  // Legacy raw lead UUID must never authenticate as a session token.
  if (looksLikeLegacyLeadIdCookie(trimmed)) return null;

  const tokenHash = hashLeadSessionToken(trimmed);
  const nowIso = new Date().toISOString();

  const { data: session, error } = await supabaseAdmin
    .from("free_review_lead_sessions")
    .select("id, lead_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !session?.id || !session.lead_id) return null;
  if (session.revoked_at) return null;
  if (String(session.expires_at) <= nowIso) return null;

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("free_review_leads")
    .select("id, status")
    .eq("id", session.lead_id)
    .maybeSingle();

  if (leadError || !lead?.id) return null;
  if (isInactiveLeadStatus(lead.status)) return null;

  // Best-effort last-used touch (ignore failures).
  void supabaseAdmin
    .from("free_review_lead_sessions")
    .update({ last_used_at: nowIso })
    .eq("id", session.id)
    .is("revoked_at", null);

  return {
    sessionId: session.id as string,
    leadId: lead.id as string,
    leadStatus: String(lead.status || ""),
  };
}

export async function resolveLeadSessionFromRequest(
  request: Request,
): Promise<LeadSessionRecord | null> {
  // Presence of legacy cookie alone must not authorize.
  const token = readLeadSessionTokenFromRequest(request);
  if (!token) return null;
  return resolveLeadSessionFromToken(token);
}

export async function rotateLeadSessionForRequest(args: {
  request: Request;
  response: NextResponse;
}): Promise<LeadSessionRecord | null> {
  const current = await resolveLeadSessionFromRequest(args.request);
  if (!current) return null;
  const issued = await issueLeadSession({
    leadId: current.leadId,
    replaceSessionId: current.sessionId,
  });
  setLeadSessionCookie(args.response, issued.token);
  return {
    sessionId: issued.sessionId,
    leadId: current.leadId,
    leadStatus: current.leadStatus,
  };
}
