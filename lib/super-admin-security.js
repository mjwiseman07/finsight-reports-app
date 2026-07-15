import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase";
import { isAllowedSuperAdminEmail, SUPER_ADMIN_ROLE, superAdminDemoCompanies } from "./super-admin";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "./reviewer/constants";

/**
 * Parse the Advisacor session cookie value from a raw `Cookie:` header.
 * Mirrors `lib/reviewer/auth.ts::parseAccessTokenFromCookieHeader`.
 * Returns the decoded token string, or null if the cookie is absent/malformed.
 */
function parseAdvisacorAccessTokenCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADVISACOR_ACCESS_TOKEN_COOKIE}=([^;]+)`),
  );
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function auditSuperAdminEvent({
  eventType,
  actorUserId,
  actorEmail,
  targetUserId,
  companyId,
  metadata = {},
}) {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from("audit_logs")
    .insert({
      event_type: `super_admin_${eventType}`,
      actor_user_id: actorUserId || null,
      actor_email: actorEmail || null,
      target_user_id: targetUserId || null,
      company_id: companyId || null,
      resource_type: "super_admin",
      resource_id: companyId || targetUserId || null,
      metadata,
      created_at: new Date().toISOString(),
    });
}

export async function resolveSuperAdminAccess(request) {
  if (!supabaseAdmin) {
    return {
      response: NextResponse.json({ error: "Supabase is not configured for super admin access." }, { status: 503 }),
    };
  }

  // Prefer Authorization: Bearer <token> (existing behavior for CLI/curl callers).
  // Fall back to advisacor_access_token cookie set by app sign-in flow so browser
  // callers (super-admin dashboards, in-browser smoke tests) work without JS
  // token gymnastics. Additive: Bearer-first ordering preserves prior behavior
  // byte-identically for existing callers.
  const authorization = request.headers.get("authorization") || "";
  let token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) {
    token = parseAdvisacorAccessTokenCookie(request.headers.get("cookie") || "") || "";
  }
  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Missing Authorization bearer token or advisacor_access_token cookie" },
        { status: 401 },
      ),
    };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user?.id || !user?.email) {
    return { response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  if (!isAllowedSuperAdminEmail(user.email)) {
    await auditSuperAdminEvent({
      eventType: "denied",
      actorUserId: user.id,
      actorEmail: user.email,
      metadata: { reason: "email_not_allowlisted" },
    });
    return { response: NextResponse.json({ error: "Super admin access is restricted." }, { status: 403 }) };
  }

  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;
  if (appRole !== SUPER_ADMIN_ROLE && userRole !== SUPER_ADMIN_ROLE) {
    await auditSuperAdminEvent({
      eventType: "denied",
      actorUserId: user.id,
      actorEmail: user.email,
      metadata: { reason: "missing_super_admin_role" },
    });
    return { response: NextResponse.json({ error: "Super admin role is required." }, { status: 403 }) };
  }

  return {
    userId: user.id,
    email: user.email,
    role: SUPER_ADMIN_ROLE,
  };
}

export async function assertDemoCompany(companyId) {
  if (!supabaseAdmin) {
    return {
      response: NextResponse.json({ error: "Supabase is not configured for super admin access." }, { status: 503 }),
    };
  }

  const fixtureCompany = superAdminDemoCompanies.find((company) => company.id === companyId);
  if (fixtureCompany) return { company: fixtureCompany };

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, is_demo")
    .eq("id", companyId)
    .maybeSingle();

  if (error?.code === "42P01") {
    return {
      response: NextResponse.json({ error: "Demo company storage is not configured yet." }, { status: 501 }),
    };
  }

  if (error) {
    return { response: NextResponse.json({ error: "Unable to validate demo company." }, { status: 500 }) };
  }

  if (!company?.is_demo) {
    return {
      response: NextResponse.json(
        { error: "Super admin impersonation is limited to demo/test companies." },
        { status: 403 },
      ),
    };
  }

  return { company };
}
