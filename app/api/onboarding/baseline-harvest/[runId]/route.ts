import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ runId: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });

    const { runId } = await ctx.params;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("baseline_harvest_runs")
      .select("id, firm_id, firm_client_id, source, status, started_at, completed_at, counts, error_message")
      .eq("id", runId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "internal", message: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (data.firm_id !== firmId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, run: data });
  } catch (e) {
    return authErrorResponse(e);
  }
}
