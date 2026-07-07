/**
 * Phase D6.5 Part 2 — Block 5
 * POST /api/fraud-signals/dispose
 */
import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

interface DisposeBody {
  signal_id: string;
  disposition: "confirmed" | "dismissed" | "escalated";
  note?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ctx = await requireFirmAuth(request);
    let body: DisposeBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    if (!body.signal_id || !body.disposition) {
      return NextResponse.json({ error: "missing signal_id or disposition" }, { status: 400 });
    }
    if (!["confirmed", "dismissed", "escalated"].includes(body.disposition)) {
      return NextResponse.json({ error: "invalid disposition" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("fraud_score_signals")
      .update({
        disposition: body.disposition,
        disposition_note: body.note ?? null,
        disposed_at: new Date().toISOString(),
        disposed_by_user_id: ctx.userId,
      })
      .eq("id", body.signal_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
