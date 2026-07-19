import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { createServiceClient } from "@/lib/supabase/service";
import { logGap3Action } from "@/lib/pre-close/gap3-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ attempt_id: string }> }) {
  const { attempt_id } = await ctx.params;
  const sb = createServiceClient();

  const { data: report, error } = await sb
    .from("v_client_posted_je_report")
    .select("firm_client_id, engagement_id, backup_packet_storage_path")
    .eq("je_attempt_id", attempt_id)
    .maybeSingle();

  if (error || !report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!report.backup_packet_storage_path) {
    return NextResponse.json({ error: "no_packet" }, { status: 404 });
  }

  const access = (await resolveFirmAccess(req, { clientId: report.firm_client_id })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const { data: signed, error: signErr } = await sb.storage
    .from("je-backup")
    .createSignedUrl(report.backup_packet_storage_path as string, 300);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  await logGap3Action({
    firmClientId: report.firm_client_id as string,
    actionCategory: "gap3_client_je_report",
    actionType: "gap3.client_je_packet_downloaded",
    actorId: access.userId ?? null,
    inputSummary: JSON.stringify({ attempt_id, engagement_id: report.engagement_id }),
  });

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
