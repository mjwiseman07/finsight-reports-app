import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase";
import { rateLimit } from "../../../../../../lib/rate-limit";
import { auditOwnerEvent, resolveOwnerBriefAccess } from "../../../../../../lib/owner-security";

export async function GET(request, context) {
  const rateLimitResponse = rateLimit(request, { key: "owner-report-link", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const { briefId } = await context.params;
  const access = await resolveOwnerBriefAccess(request, briefId);
  if (access.response) return access.response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "ppt" ? "ppt" : "pdf";
  const storagePath = type === "ppt" ? access.brief.ppt_storage_path : access.brief.pdf_storage_path;

  if (!storagePath) {
    return NextResponse.json(
      { error: "Signed report access is not configured for this owner brief yet." },
      { status: 501 },
    );
  }

  const bucket = process.env.OWNER_REPORTS_BUCKET || "owner-reports";
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(storagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create secure report link." }, { status: 500 });
  }

  await auditOwnerEvent({
    eventType: "owner_report_opened",
    briefId,
    companyId: access.brief.company_id,
    ownerUserId: access.ownerUserId,
    metadata: { auth_mode: access.authMode, report_type: type },
  });

  return NextResponse.redirect(data.signedUrl);
}
