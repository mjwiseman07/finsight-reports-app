import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { rejectDraft } from "@/lib/ap-intake/inbox/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    await rejectDraft({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      draftId: id,
      reviewerUserId: String(body.reviewer_user_id ?? auth.userId),
      reason: body.reason,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    return authErrorResponse(e);
  }
}
