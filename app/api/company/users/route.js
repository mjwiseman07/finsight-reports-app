import { NextResponse } from "next/server";
import { companyRoleDefinitions } from "../../../../lib/company-account";
import { getAuthenticatedCompanyUser, resolveCompanyMembership } from "../../../../lib/company-security";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim();
  return companyRoleDefinitions.some((definition) => definition.role === normalizedRole) ? normalizedRole : "viewer";
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "company-users-read", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;

  const { searchParams } = new URL(request.url);
  const companyId = String(searchParams.get("companyId") || "").trim();
  if (!companyId) return NextResponse.json({ error: "companyId is required." }, { status: 400 });

  const membership = await resolveCompanyMembership({ userId: access.user.id, companyId });
  if (membership.response) return membership.response;

  const { data: users, error } = await supabaseAdmin
    .from("company_users")
    .select("id, company_id, user_id, role, status, invited_by, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Unable to load company users." }, { status: 500 });

  const { data: invitations } = await supabaseAdmin
    .from("company_invitations")
    .select("id, email, role, status, invited_by, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ users: users || [], invitations: invitations || [] });
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "company-users-write", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => ({}));
  const companyId = String(body.company_id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const role = normalizeRole(body.role);

  if (!companyId || !email) {
    return NextResponse.json({ error: "company_id and email are required." }, { status: 400 });
  }

  const membership = await resolveCompanyMembership({
    userId: access.user.id,
    companyId,
    requiredPermission: "manage_users",
  });
  if (membership.response) return membership.response;

  const { data, error } = await supabaseAdmin
    .from("company_invitations")
    .insert({
      company_id: companyId,
      email,
      role,
      status: "pending",
      invited_by: access.user.id,
    })
    .select("id, email, role, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Unable to invite company user." }, { status: 500 });

  return NextResponse.json({ ok: true, invitation: data });
}
