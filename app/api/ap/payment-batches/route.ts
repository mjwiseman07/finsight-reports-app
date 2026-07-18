import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createPaymentBatch } from "@/lib/ap-intake/payments/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const body = await req.json();
    const currency = typeof body.currency === "string" ? body.currency.trim() : "";
    if (!currency) {
      return NextResponse.json({ error: "currency required" }, { status: 400 });
    }
    const out = await createPaymentBatch({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      batchNumber: String(body.batch_number),
      currency,
      requestedByUserId: String(body.requested_by_user_id ?? auth.userId),
    });
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    return authErrorResponse(e);
  }
}
