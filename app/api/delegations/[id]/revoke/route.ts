import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { revokeDelegation } from "@/lib/ap-intake/approvals/delegation-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const engagementId = typeof body?.engagement_id === "string" ? body.engagement_id : null;
    if (!engagementId) {
      return NextResponse.json(
        { error: "engagement_id is required for entitlement enforcement" },
        { status: 400 },
      );
    }
    await revokeDelegation({
      delegationId: id,
      actorUserId: auth.userId,
      firmId,
      engagementId,
      firmClientId:
        typeof body.firm_client_id === "string" ? body.firm_client_id : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
