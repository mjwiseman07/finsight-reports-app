import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createDelegation } from "@/lib/ap-intake/approvals/delegation-service";
import { ApprovalValidationError } from "@/lib/ap-intake/approvals/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const engagementId = typeof body?.engagement_id === "string" ? body.engagement_id : null;
    if (!engagementId) {
      return NextResponse.json(
        { error: "engagement_id is required for entitlement enforcement" },
        { status: 400 },
      );
    }
    for (const f of ["delegate_user_id", "effective_to"]) {
      if (!body?.[f]) {
        return NextResponse.json(
          { error: "validation", field: f, message: `${f} required` },
          { status: 422 },
        );
      }
    }
    const id = await createDelegation({
      firmId,
      delegatorUserId: auth.userId,
      delegateUserId: String(body.delegate_user_id),
      scope: body.scope ?? "ap_requisitions",
      effectiveFrom: body.effective_from ? new Date(body.effective_from) : undefined,
      effectiveTo: new Date(body.effective_to),
      reason: body.reason,
      actorUserId: auth.userId,
      engagementId,
      firmClientId:
        typeof body.firm_client_id === "string" ? body.firm_client_id : undefined,
    });
    return NextResponse.json({ ok: true, delegation_id: id });
  } catch (err) {
    if (err instanceof ApprovalValidationError) {
      return NextResponse.json(
        { error: "validation", field: err.field, message: err.message },
        { status: 422 },
      );
    }
    return authErrorResponse(err);
  }
}
