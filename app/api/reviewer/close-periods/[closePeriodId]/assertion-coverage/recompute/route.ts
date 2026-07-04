import { NextResponse, type NextRequest } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { runProjectionWorker } from "@/lib/assertions/projection-worker";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ closePeriodId: string }> },
) {
  try {
    const { closePeriodId } = await params;
    const ctx = await requireFirmAuth(req);
    const db = createServiceClient();

    const { data: cp, error: cpErr } = await db
      .from("close_periods")
      .select("id, firm_client_id, firm_clients!inner(firm_id)")
      .eq("id", closePeriodId)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp) return NextResponse.json({ error: "close_period_not_found" }, { status: 404 });

    const fc = cp.firm_clients as unknown as { firm_id: string } | { firm_id: string }[] | null;
    const firmId = Array.isArray(fc) ? fc[0]?.firm_id : fc?.firm_id;
    if (!firmId || !ctx.writerFirmIds.includes(firmId)) {
      return NextResponse.json({ error: "forbidden_writer_only" }, { status: 403 });
    }

    const result = await runProjectionWorker(cp.firm_client_id as string, closePeriodId);
    return NextResponse.json(result);
  } catch (e) {
    return authErrorResponse(e);
  }
}
