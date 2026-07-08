import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending_reviewer";
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("refund_request_drafts")
      .select("*")
      .eq("firm_id", firmId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ drafts: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
