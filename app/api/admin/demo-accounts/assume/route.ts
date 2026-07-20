// File: app/api/admin/demo-accounts/assume/route.ts
//
// POST — set the impersonation cookie to a demo firm_id. Super-admin only.
// Only accepts demo firm ids.

import { NextResponse } from "next/server";
import {
  auditSuperAdminEvent,
  resolveSuperAdminAccess,
} from "@/lib/super-admin-security";
import { DEMO_FIRMS } from "@/lib/demo/constants";
import { setImpersonationCookie } from "@/lib/demo/impersonation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
    email?: string;
  };
  if (access.response) return access.response;

  let body: { firmId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { firmId } = body;
  if (!firmId) {
    return NextResponse.json({ error: "firmId is required" }, { status: 400 });
  }

  const demoFirm = DEMO_FIRMS.find((f) => f.firmId === firmId);
  if (!demoFirm) {
    return NextResponse.json(
      { error: "firmId is not a demo firm" },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    firmId,
    firmName: demoFirm.firmName,
    tierKey: demoFirm.tierKey,
  });
  setImpersonationCookie(response, firmId);

  await auditSuperAdminEvent({
    eventType: "impersonate_firm_start",
    actorUserId: access.userId ?? null,
    actorEmail: access.email ?? null,
    targetUserId: null,
    companyId: null,
    metadata: { firm_id: firmId, tier_key: demoFirm.tierKey },
  });

  return response;
}
