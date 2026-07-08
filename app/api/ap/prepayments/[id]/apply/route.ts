import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { applyPrepayment, PrepaymentValidationError } from "@/lib/ap-intake/prepayment/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    await ctx.params;
    const body = await req.json().catch(() => ({}));
    const id = await applyPrepayment({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      vendorId: String(body.vendor_id),
      billId: String(body.bill_id),
      amountCents: Number(body.amount_cents),
      currency: String(body.currency),
      actorUserId: auth.userId,
    });
    return NextResponse.json({ ok: true, ledger_id: id });
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    if (e instanceof PrepaymentValidationError) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
