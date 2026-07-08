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
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("vendor_prepayment_balances")
      .select("*")
      .eq("firm_id", firmId)
      .gt("balance_cents", 0);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const today = new Date();
    const rows = (data ?? []).map((row) => {
      const agingDays = row.oldest_open_prepayment_date
        ? Math.floor(
            (today.getTime() - new Date(row.oldest_open_prepayment_date).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
      return { ...row, aging_days: agingDays };
    });
    return NextResponse.json({ balances: rows });
  } catch (e) {
    return authErrorResponse(e);
  }
}
