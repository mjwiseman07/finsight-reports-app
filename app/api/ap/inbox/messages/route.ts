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
    const intent = url.searchParams.get("intent");
    const supabase = createServiceClient();
    let query = supabase
      .from("vendor_ap_inbox_messages")
      .select("id, channel, direction, intent, intent_confidence, subject, received_at, sender_address")
      .eq("firm_id", firmId)
      .order("received_at", { ascending: false })
      .limit(200);
    if (intent) query = query.eq("intent", intent);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
