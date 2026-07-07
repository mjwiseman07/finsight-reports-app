import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import {
  approveApprovalStep,
  ApprovalValidationError,
} from "@/lib/ap-intake/approvals/chain-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ stepId: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    if (!auth.firmIds[0]) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { stepId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    await approveApprovalStep({
      stepId,
      approverUserId: auth.userId,
      comment: body?.comment,
    });
    return NextResponse.json({ ok: true });
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
