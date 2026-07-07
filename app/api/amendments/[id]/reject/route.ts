import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import {
  rejectAmendment,
  AmendmentValidationError,
} from "@/lib/ap-intake/amendments/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    if (!auth.firmIds[0]) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    if (!body?.reason) {
      return NextResponse.json(
        { error: "validation", field: "reason", message: "reason required" },
        { status: 422 },
      );
    }
    await rejectAmendment({
      amendmentId: id,
      approverUserId: auth.userId,
      reason: String(body.reason),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AmendmentValidationError) {
      return NextResponse.json(
        { error: "validation", field: err.field, message: err.message },
        { status: 422 },
      );
    }
    return authErrorResponse(err);
  }
}
