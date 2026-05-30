import { NextResponse } from "next/server";
import { ownerSuggestedQuestions } from "../../../../../lib/executive-delivery-architecture";
import { rateLimit } from "../../../../../lib/rate-limit";
import { auditOwnerEvent, resolveOwnerBriefAccess } from "../../../../../lib/owner-security";

export async function GET(request, context) {
  const rateLimitResponse = rateLimit(request, { key: "owner-brief-open", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const { briefId } = await context.params;
  const access = await resolveOwnerBriefAccess(request, briefId);
  if (access.response) return access.response;

  await auditOwnerEvent({
    eventType: "owner_brief_opened",
    briefId,
    companyId: access.brief.company_id,
    ownerUserId: access.ownerUserId,
    metadata: { auth_mode: access.authMode },
  });

  return NextResponse.json({
    brief: {
      id: access.brief.id,
      company_id: access.brief.company_id,
      report_type: access.brief.report_type,
      period_label: access.brief.period_label,
      package_level: access.brief.package_level,
      owner_summary: access.brief.owner_summary,
      status: access.brief.status,
    },
    suggested_questions: ownerSuggestedQuestions,
  });
}
