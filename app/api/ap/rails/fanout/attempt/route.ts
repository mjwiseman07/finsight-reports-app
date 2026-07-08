import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { attemptRailFanout } from "@/lib/ap-intake/payments/service";
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
    const out = await attemptRailFanout({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      batchId: String(body.batch_id),
      batchLineId: String(body.batch_line_id),
      vendorId: String(body.vendor_id),
      vendorBankAccountId: String(body.vendor_bank_account_id),
      amountCents: Number(body.amount_cents),
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
