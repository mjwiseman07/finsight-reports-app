import { NextResponse, type NextRequest } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(
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
    if (!firmId || !ctx.firmIds.includes(firmId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: rows, error: rErr } = await db
      .from("close_assertion_coverage")
      .select("*")
      .eq("firm_client_id", cp.firm_client_id)
      .eq("close_period_id", closePeriodId)
      .order("account_category")
      .order("assertion_id");
    if (rErr) throw rErr;

    return NextResponse.json({
      close_period_id: closePeriodId,
      firm_client_id: cp.firm_client_id,
      rows: rows ?? [],
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
