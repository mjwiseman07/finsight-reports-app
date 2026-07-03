import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ fire_id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { fire_id } = await context.params;
  const body = (await req.json().catch(() => ({}))) as { skip_reason?: unknown };
  const reason = typeof body.skip_reason === "string" ? body.skip_reason.trim() : "";
  if (reason === "") {
    return NextResponse.json({ error: "skip_reason_required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: fire } = await supabase
    .from("recurring_fires")
    .select("firm_client_id, status")
    .eq("fire_id", fire_id)
    .maybeSingle();
  if (!fire) return NextResponse.json({ error: "fire_not_found" }, { status: 404 });

  const access = (await resolveFirmAccess(req, { clientId: fire.firm_client_id })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;
  if (!access.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("recurring_fires")
    .update({
      status: "skipped",
      skip_reason: reason,
      reviewer_user_id: access.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("fire_id", fire_id)
    .eq("status", "proposed") // optimistic concurrency
    .select("fire_id, status")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "fire_not_proposed" }, { status: 409 });
  return NextResponse.json({ fire_id, status: "skipped" });
}
