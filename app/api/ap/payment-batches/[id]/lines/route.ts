import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { addBatchLine } from "@/lib/ap-intake/payments/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const { id } = await context.params;
    const body = await req.json();
    const currencyCode = typeof body.currency === "string" ? body.currency.trim() : "";
    if (!currencyCode) {
      return NextResponse.json({ error: "currency required" }, { status: 400 });
    }
    const out = await addBatchLine({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      batchId: id,
      vendorId: String(body.vendor_id),
      billId: body.bill_id ? String(body.bill_id) : null,
      requisitionId: body.requisition_id ? String(body.requisition_id) : null,
      grossAmountCents: Number(body.gross_amount_cents),
      currencyCode,
      appliedCreditCents: body.applied_credit_cents != null ? Number(body.applied_credit_cents) : 0,
      appliedPrepaymentCents:
        body.applied_prepayment_cents != null ? Number(body.applied_prepayment_cents) : 0,
      glAccountCode: body.gl_account_code ? String(body.gl_account_code) : null,
      memo: body.memo ? String(body.memo) : null,
      actorUserId: String(body.actor_user_id ?? auth.userId),
    });
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    return authErrorResponse(e);
  }
}
