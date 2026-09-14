/**
 * Free Review opaque lead sessions.
 *
 * Contract:
 * - Cookie `free_review_lead_session` holds only a cryptographically random opaque token.
 * - Server stores SHA-256(token) hex in `free_review_lead_sessions.token_hash`.
 * - Lead UUID from body/query/URL/localStorage/legacy cookie never authenticates.
 * - Active session requires: unrevoked, unexpired, lead status ∈ ACTIVE_LEAD_STATUSES.
 * - Rotation is atomic via RPC `rotate_free_review_lead_session` (lead row lock).
 * - Retention: 30 days after a session becomes non-authorizing; cleanup via
 *   `cleanup_free_review_lead_sessions` (no production cron in this change).
 * - Bearer and session cookie: invalid bearer fails closed (no cookie fallback).
 *   Valid bearer takes precedence; conflicting claimed lead vs session fails closed.
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

/** Hashed session rows kept this long after becoming non-authorizing. */
export const LEAD_SESSION_RETENTION_DAYS = 30;

/**
 * Explicit allowlist of Free Review lifecycle statuses that may authenticate.
 * Inventory (server-produced only):
 * - lead_captured — POST /api/free-review/leads
 * - onboarding_started — PATCH enrich (server-controlled)
 * - quickbooks_connected — QBO OAuth callback
 * - xero_connected — Xero entity selection
 */
export const ACTIVE_LEAD_STATUSES = [
  "lead_captured",
  "onboarding_started",
  "quickbooks_connected",
  "xero_connected",
] as const;

export type ActiveLeadStatus = (typeof ACTIVE_LEAD_STATUSES)[number];

const ACTIVE_LEAD_STATUS_SET = new Set<string>(ACTIVE_LEAD_STATUSES);

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

export function isActiveLeadStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return false;
  return ACTIVE_LEAD_STATUS_SET.has(normalized);
}

/** @deprecated Prefer isActiveLeadStatus (allowlist). Kept for call-site clarity in denials. */
export function isInactiveLeadStatus(status: string | null | undefined): boolean {
  return !isActiveLeadStatus(status);
}

/**
 * Server-controlled enrich transition. Clients never choose auth-relevant status.
 * Preserves provider-connected statuses; advances lead_captured → onboarding_started.
 */
export function serverControlledStatusAfterEnrich(
  currentStatus: string | null | undefined,
): ActiveLeadStatus | null {
  if (!isActiveLeadStatus(currentStatus)) return null;
  const normalized = String(currentStatus).trim().toLowerCase() as ActiveLeadStatus;
  if (normalized === "lead_captured") return "onboarding_started";
  return normalized;
}

/**
 * Conditional enrich plan: status written only with an exact DB predicate.
 * - lead_captured → set onboarding_started iff row still exactly lead_captured
 * - other allowlisted → do not overwrite status; predicate is the exact current status
 * - inactive/unknown → deny (caller must not write enrichment fields)
 */
export type LeadEnrichUpdatePlan =
  | {
      ok: true;
      /** Exact status required on the row at UPDATE time. */
      statusPredicate: ActiveLeadStatus;
      /** When set, include status in the UPDATE payload; otherwise leave status untouched. */
      statusWrite: ActiveLeadStatus | null;
    }
  | { ok: false };

export function planLeadEnrichUpdate(
  resolvedStatus: string | null | undefined,
): LeadEnrichUpdatePlan {
  if (!isActiveLeadStatus(resolvedStatus)) return { ok: false };
  const normalized = String(resolvedStatus).trim().toLowerCase() as ActiveLeadStatus;
  if (normalized === "lead_captured") {
    return {
      ok: true,
      statusPredicate: "lead_captured",
      statusWrite: "onboarding_started",
    };
  }
  return {
    ok: true,
    statusPredicate: normalized,
    statusWrite: null,
  };
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
 * Atomically rotate/issue a session via DB transaction RPC.
 * Returns the opaque token once (never log it; never send plaintext to SQL).
 */
export async function issueLeadSession(args: {
  leadId: string;
}): Promise<{ token: string; sessionId: string; expiresAt: string }> {
  if (!supabaseAdmin) throw new Error("supabase_admin_unavailable");

  const token = generateLeadSessionToken();
  const tokenHash = hashLeadSessionToken(token);
  const expiresAt = new Date(Date.now() + LEAD_SESSION_TTL_SECONDS * 1000).toISOString();

  const { data: sessionId, error } = await supabaseAdmin.rpc("rotate_free_review_lead_session", {
    p_lead_id: args.leadId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });

  if (error || !sessionId) {
    const message = String(error?.message || "");
    const code = String((error as { code?: string } | null)?.code || "");
    // Unique conflicts (token_hash or one-unrevoked-per-lead) — sanitized fail-closed.
    if (
      code === "23505" ||
      message.includes("free_review_lead_sessions_one_unrevoked_per_lead") ||
      message.includes("free_review_lead_sessions_token_hash") ||
      /duplicate key|unique/i.test(message)
    ) {
      throw new Error("lead_session_conflict");
    }
    if (message.includes("lead_status_not_active")) {
      throw new Error("lead_status_not_active");
    }
    if (message.includes("lead_not_found")) {
      throw new Error("lead_not_found");
    }
    throw new Error("lead_session_issue_failed");
  }

  return { token, sessionId: String(sessionId), expiresAt };
}

/**
 * Delete expired/revoked hashed sessions older than retention.
 * Failures must be reported to the caller (do not swallow).
 * Never deletes active unexpired sessions (enforced in SQL).
 */
export async function cleanupExpiredLeadSessions(
  retentionDays: number = LEAD_SESSION_RETENTION_DAYS,
): Promise<number> {
  if (!supabaseAdmin) throw new Error("supabase_admin_unavailable");
  const { data, error } = await supabaseAdmin.rpc("cleanup_free_review_lead_sessions", {
    p_retention_days: retentionDays,
  });
  if (error) {
    throw new Error(`lead_session_cleanup_failed:${error.message || "unknown"}`);
  }
  return Number(data || 0);
}

export async function resolveLeadSessionFromToken(
  token: string,
): Promise<LeadSessionRecord | null> {
  if (!supabaseAdmin) return null;
  const trimmed = String(token || "").trim();
  if (!trimmed) return null;

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
  if (!isActiveLeadStatus(lead.status)) return null;

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
  const issued = await issueLeadSession({ leadId: current.leadId });
  setLeadSessionCookie(args.response, issued.token);
  return {
    sessionId: issued.sessionId,
    leadId: current.leadId,
    leadStatus: current.leadStatus,
  };
}
