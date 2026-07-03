import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { postFire } from "@/lib/recurring/je-poster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ fire_id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { fire_id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: fire, error: loadErr } = await supabase
    .from("recurring_fires")
    .select("firm_client_id, status")
    .eq("fire_id", fire_id)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!fire) return NextResponse.json({ error: "fire_not_found" }, { status: 404 });
  if (fire.status !== "proposed") {
    return NextResponse.json({ error: "fire_not_proposed", status: fire.status }, { status: 409 });
  }

  const access = (await resolveFirmAccess(req, { clientId: fire.firm_client_id })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;
  if (!access.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Manual post bypasses the D5.4 auto-post gate (a reviewer can force a post
  // even when auto_post is off). Cash-basis is still blocked by D5.3's poster.
  const result = await postFire(fire_id);

  // Stamp reviewer for the audit trail (best-effort — post already ran).
  await supabase
    .from("recurring_fires")
    .update({ reviewer_user_id: access.userId, reviewed_at: new Date().toISOString() })
    .eq("fire_id", fire_id);

  return NextResponse.json(result);
}
