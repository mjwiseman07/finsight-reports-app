import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import {
  createApprovalChain,
  ApprovalValidationError,
} from "@/lib/ap-intake/approvals/chain-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    if (!auth.firmIds[0]) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    if (!Array.isArray(body?.steps) || body.steps.length === 0) {
      return NextResponse.json(
        { error: "validation", field: "steps", message: "steps[] required" },
        { status: 422 },
      );
    }
    const chainId = await createApprovalChain({
      requisitionId: id,
      strategy: body?.strategy,
      steps: body.steps.map((s: { order_index?: number; approver_user_id: string; required_role?: string; threshold_amount_cents?: number }, i: number) => ({
        orderIndex: typeof s.order_index === "number" ? s.order_index : i,
        approverUserId: String(s.approver_user_id),
        requiredRole: s.required_role,
        thresholdAmountCents:
          typeof s.threshold_amount_cents === "number" ? s.threshold_amount_cents : undefined,
      })),
      actorUserId: auth.userId,
    });
    return NextResponse.json({ ok: true, chain_id: chainId });
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
