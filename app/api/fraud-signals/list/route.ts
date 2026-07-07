/**
 * Phase D6.5 Part 2 — Block 5
 * GET /api/fraud-signals/list?bill_id=
 */
import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireFirmAuth(request);
    const billId = new URL(request.url).searchParams.get("bill_id");
    if (!billId) {
      return NextResponse.json({ error: "missing bill_id" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("fraud_score_signals")
      .select(
        "id, layer, signal_code, severity, contribution, evidence, disposition, disposition_note, disposed_at, detected_at, aggregated_score_snapshot",
      )
      .eq("bill_id", billId)
      .order("detected_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: bill } = await supabase
      .from("ap_intake_bills")
      .select("fraud_score_current")
      .eq("id", billId)
      .maybeSingle();

    return NextResponse.json({
      bill_id: billId,
      aggregated_score: bill?.fraud_score_current ?? null,
      signals: data ?? [],
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
