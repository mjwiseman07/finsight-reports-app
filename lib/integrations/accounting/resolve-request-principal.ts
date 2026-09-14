/**
 * Resolve the effective accounting principal for dashboard/accounting APIs.
 *
 * Authority (fail closed):
 * 1. Bearer access token → authenticated user id
 *    - Invalid bearer never falls through to lead session.
 *    - Valid bearer takes precedence over a co-present lead session cookie
 *      (explicit precedence: signed-in user wins).
 * 2. Opaque HttpOnly `free_review_lead_session` cookie → hashed server session
 *    + active lead row (not inactive/revoked/expired).
 *
 * Never authenticating:
 * - body/query/URL leadId
 * - localStorage lead ids
 * - legacy `free_review_lead_id` cookie (raw UUID)
 */
import { supabaseAdmin } from "@/lib/supabase";
import {
  LEGACY_LEAD_ID_COOKIE,
  LEAD_SESSION_COOKIE,
  readLeadSessionTokenFromRequest,
  readLegacyLeadIdCookie,
  resolveLeadSessionFromToken,
} from "@/lib/free-review/lead-session";

export type AccountingPrincipal =
  | { kind: "user"; userId: string }
  | { kind: "lead"; userId: string; leadId: string; sessionId: string };

export type AccountingPrincipalDenial = {
  status: 401 | 503;
  body: { error: string };
};

function extractBearer(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice("Bearer ".length).trim();
}

function extractClaimedLeadId(request: Request, body?: Record<string, unknown>): string {
  if (body) {
    const fromBody = String(body.leadId || body.lead_id || "").trim();
    if (fromBody) return fromBody;
  }
  try {
    const url = new URL(request.url);
    return String(url.searchParams.get("leadId") || url.searchParams.get("lead_id") || "").trim();
  } catch {
    return "";
  }
}

export async function resolveAccountingRequestPrincipal(args: {
  request: Request;
  /** Optional already-parsed JSON body (POST routes). */
  body?: Record<string, unknown>;
}): Promise<AccountingPrincipal | AccountingPrincipalDenial> {
  if (!supabaseAdmin) {
    return {
      status: 503,
      body: { error: "Supabase admin client is not configured" },
    };
  }

  const token = extractBearer(args.request);
  const sessionToken = readLeadSessionTokenFromRequest(args.request);
  const legacyCookie = readLegacyLeadIdCookie(args.request);
  const claimedLeadId = extractClaimedLeadId(args.request, args.body);

  // Legacy raw-ID cookie must never authorize (and signals clients to clear it).
  if (legacyCookie && !sessionToken && !token) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (token) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      // Fail closed: do not fall through to lead session when bearer is present but invalid.
      return { status: 401, body: { error: "Invalid or expired token" } };
    }
    // Explicit precedence: valid bearer wins over co-present lead session cookie.
    return { kind: "user", userId: authData.user.id };
  }

  if (!sessionToken) {
    return {
      status: 401,
      body: { error: "Missing Authorization bearer token or lead session" },
    };
  }

  const session = await resolveLeadSessionFromToken(sessionToken);
  if (!session) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  // Optional UX claim must match the session-proven lead; never authorizes alone.
  if (claimedLeadId && claimedLeadId !== session.leadId) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  return {
    kind: "lead",
    userId: session.leadId,
    leadId: session.leadId,
    sessionId: session.sessionId,
  };
}

export function isAccountingPrincipalDenial(
  value: AccountingPrincipal | AccountingPrincipalDenial,
): value is AccountingPrincipalDenial {
  return "status" in value && "body" in value;
}

export { LEAD_SESSION_COOKIE, LEGACY_LEAD_ID_COOKIE };
