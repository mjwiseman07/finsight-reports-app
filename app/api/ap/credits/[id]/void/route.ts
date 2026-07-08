import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { voidCredit, CreditValidationError } from "@/lib/ap-intake/credits/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    await voidCredit({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      creditId: id,
      reason: String(body.reason),
      actorUserId: auth.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    if (e instanceof CreditValidationError) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
