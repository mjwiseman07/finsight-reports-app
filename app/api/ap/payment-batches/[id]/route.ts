import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const { id } = await context.params;
    const supabase = createServiceClient();
    const { data: batch } = await supabase
      .from("payment_batches")
      .select("*")
      .eq("id", id)
      .eq("firm_id", firmId)
      .maybeSingle();
    if (!batch) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { data: lines } = await supabase
      .from("payment_batch_lines")
      .select("*")
      .eq("batch_id", id);
    const { data: events } = await supabase
      .from("payment_batch_interlock_events")
      .select("*")
      .eq("batch_id", id)
      .order("computed_at", { ascending: false });
    return NextResponse.json({ batch, lines: lines ?? [], interlock_events: events ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
