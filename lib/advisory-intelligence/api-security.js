import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser, resolveCompanyMembership } from "../company-security";
import { auditSecurityEvent } from "../security-audit";
import { supabaseAdmin } from "../supabase";

export function advisorySchemaError(error) {
  const message = `${error?.message || ""} ${error?.details || ""}`;
  return error?.code === "42P01" || error?.code === "42703" || error?.code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist");
}

export async function requireAdvisoryCompanyAccess(request, { companyId, requiredPermission } = {}) {
  if (!supabaseAdmin) return { response: NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 }) };
  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access;
  if (!companyId) return { response: NextResponse.json({ error: "companyId is required." }, { status: 400 }) };
  const membership = await resolveCompanyMembership({
    userId: access.user.id,
    companyId,
    requiredPermission,
  });
  if (membership.response) return membership;
  return { user: access.user, membership: membership.membership };
}

export async function auditAdvisoryAction({ eventType, user, companyId, resourceId = null, metadata = {} }) {
  return auditSecurityEvent({
    eventType,
    actorUserId: user?.id || null,
    actorEmail: user?.email || null,
    companyId,
    resourceType: "advisory_intelligence",
    resourceId,
    metadata,
  });
}
