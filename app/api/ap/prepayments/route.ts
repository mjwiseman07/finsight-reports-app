import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { recordPrepayment, PrepaymentValidationError } from "@/lib/ap-intake/prepayment/service";
import { createServiceClient } from "@/lib/supabase/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const id = await recordPrepayment({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      vendorId: String(body.vendor_id),
      amountCents: Number(body.amount_cents),
      currency: String(body.currency),
      notes: body.notes,
      actorUserId: auth.userId,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    if (e instanceof PrepaymentValidationError) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    return authErrorResponse(e);
  }
}

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
      .gt("balance_cents", 0)
      .order("oldest_open_prepayment_date", { ascending: true })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ balances: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
