import { NextResponse } from "next/server";
import { superAdminActionTypes, superAdminPackageLevels, superAdminPersonaModes } from "../../../../lib/super-admin";
import {
  assertDemoCompany,
  auditSuperAdminEvent,
  resolveSuperAdminAccess,
} from "../../../../lib/super-admin-security";
import { rateLimit } from "../../../../lib/rate-limit";

function normalizeAction(action) {
  return String(action || "").trim();
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "admin-actions", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveSuperAdminAccess(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => ({}));
  const action = normalizeAction(body.action);
  const companyId = String(body.company_id || "").trim();

  if (!superAdminActionTypes.includes(action)) {
    return NextResponse.json({ error: "Invalid super admin action." }, { status: 400 });
  }

  if (companyId) {
    const demoCompany = await assertDemoCompany(companyId);
    if (demoCompany.response) return demoCompany.response;
  }

  if (action === "impersonation_started" && !companyId) {
    return NextResponse.json({ error: "Demo/test company is required for impersonation." }, { status: 400 });
  }

  if (action === "persona_switched" && !superAdminPersonaModes.includes(body.persona_mode)) {
    return NextResponse.json({ error: "Invalid persona mode." }, { status: 400 });
  }

  if (action === "package_switched" && !superAdminPackageLevels.includes(body.package_level)) {
    return NextResponse.json({ error: "Invalid package level." }, { status: 400 });
  }

  await auditSuperAdminEvent({
    eventType: action,
    actorUserId: access.userId,
    actorEmail: access.email,
    targetUserId: body.target_user_id || null,
    companyId: companyId || null,
    metadata: {
      persona_mode: body.persona_mode || null,
      package_level: body.package_level || null,
      account_type: body.account_type || null,
      workflow: body.workflow || null,
      test_only: true,
    },
  });

  return NextResponse.json({
    ok: true,
    action,
    message: "Super admin test action logged. Execution is limited to demo/test workflows.",
  });
}
