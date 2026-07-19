import { NextResponse } from "next/server";
import { resolveFirmAccessFromEngagement } from "@/lib/firm-security-engagement";
import { createServiceClient } from "@/lib/supabase/service";
import { logGap3Action } from "@/lib/pre-close/gap3-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const engagementId = url.searchParams.get("engagement_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!engagementId) {
    return NextResponse.json({ error: "engagement_id_required" }, { status: 400 });
  }

  const access = await resolveFirmAccessFromEngagement(req, engagementId);
  if (access.response) return access.response;

  const sb = createServiceClient();
  let query = sb
    .from("v_client_posted_je_report")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("posted_at", { ascending: false })
    .limit(500);

  if (from) query = query.gte("posted_at", from);
  if (to) query = query.lte("posted_at", to);

  const { data, error } = await query;
  if (error) {
    console.error("[gap3.posted-je-report] load failed", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  await logGap3Action({
    firmClientId: (data?.[0] as { firm_client_id?: string } | undefined)?.firm_client_id ?? null,
    actionCategory: "gap3_client_je_report",
    actionType: "gap3.client_je_report_listed",
    actorId: access.userId ?? null,
    inputSummary: JSON.stringify({
      engagement_id: engagementId,
      row_count: data?.length ?? 0,
      from,
      to,
    }),
  });

  return NextResponse.json({ entries: data ?? [] });
}
