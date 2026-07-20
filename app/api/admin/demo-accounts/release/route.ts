// File: app/api/admin/demo-accounts/release/route.ts
//
// POST — clear the impersonation cookie. Super-admin only.

import { NextResponse } from "next/server";
import {
  auditSuperAdminEvent,
  resolveSuperAdminAccess,
} from "@/lib/super-admin-security";
import {
  clearImpersonationCookie,
  readImpersonationCookieFromRequest,
} from "@/lib/demo/impersonation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
    email?: string;
  };
  if (access.response) return access.response;

  const priorFirmId = readImpersonationCookieFromRequest(request);

  const response = NextResponse.json({ ok: true, priorFirmId });
  clearImpersonationCookie(response);

  await auditSuperAdminEvent({
    eventType: "impersonate_firm_end",
    actorUserId: access.userId ?? null,
    actorEmail: access.email ?? null,
    targetUserId: null,
    companyId: null,
    metadata: { firm_id: priorFirmId },
  });

  return response;
}
