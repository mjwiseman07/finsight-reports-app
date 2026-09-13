/**
 * Resolve the effective accounting principal for dashboard/accounting APIs.
 *
 * Authority order (fail closed):
 * 1. Bearer access token → authenticated user id
 * 2. HttpOnly free_review_lead_id cookie + live free_review_leads row
 *
 * Caller-supplied leadId / lead_id in body or query NEVER authorizes.
 * If a caller supplies leadId, it must match the cookie-proven lead or the
 * request is rejected (prevents identity substitution while preserving
 * clients that still send leadId for UX).
 */
import { supabaseAdmin } from "@/lib/supabase";

export type AccountingPrincipal =
  | { kind: "user"; userId: string }
  | { kind: "lead"; userId: string; leadId: string };

export type AccountingPrincipalDenial = {
  status: 401 | 503;
  body: { error: string };
};

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return String(match[1]).trim();
  }
}

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
  if (token) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return { status: 401, body: { error: "Invalid or expired token" } };
    }
    return { kind: "user", userId: authData.user.id };
  }

  const cookieLeadId = readCookie(args.request, "free_review_lead_id");
  if (!cookieLeadId) {
    return {
      status: 401,
      body: { error: "Missing Authorization bearer token or lead session" },
    };
  }

  const claimedLeadId = extractClaimedLeadId(args.request, args.body);
  if (claimedLeadId && claimedLeadId !== cookieLeadId) {
    // Generic denial — do not confirm whether either lead exists.
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const { data: lead, error } = await supabaseAdmin
    .from("free_review_leads")
    .select("id")
    .eq("id", cookieLeadId)
    .maybeSingle();

  if (error || !lead?.id) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  return { kind: "lead", userId: lead.id, leadId: lead.id };
}

export function isAccountingPrincipalDenial(
  value: AccountingPrincipal | AccountingPrincipalDenial,
): value is AccountingPrincipalDenial {
  return "status" in value && "body" in value;
}
