import { NextResponse } from "next/server";
import { companyRoleDefinitions } from "./company-account";
import { supabaseAdmin } from "./supabase";

export async function getAuthenticatedCompanyUser(request) {
  if (!supabaseAdmin) {
    return { response: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return { response: NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;

  if (error || !user?.id) {
    return { response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  return { user };
}

export function roleHasPermission(role, permission) {
  const definition = companyRoleDefinitions.find((candidate) => candidate.role === role);
  return Boolean(definition?.permissions?.includes(permission));
}

export async function resolveCompanyMembership({ userId, companyId, requiredPermission }) {
  if (!supabaseAdmin) {
    return { response: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  }

  const { data: membership, error } = await supabaseAdmin
    .from("company_users")
    .select("company_id, user_id, role, status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error?.code === "42P01") {
    return { response: NextResponse.json({ error: "Company account tables are not configured." }, { status: 501 }) };
  }

  if (error || !membership) {
    return { response: NextResponse.json({ error: "Company access is restricted." }, { status: 403 }) };
  }

  if (requiredPermission && !roleHasPermission(membership.role, requiredPermission)) {
    return { response: NextResponse.json({ error: "This company role cannot perform that action." }, { status: 403 }) };
  }

  return { membership };
}
