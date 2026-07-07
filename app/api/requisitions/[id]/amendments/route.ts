import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import {
  requestAmendment,
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
    for (const f of ["reason", "changes_json", "new_total_cents"]) {
      if (body?.[f] === undefined) {
        return NextResponse.json(
          { error: "validation", field: f, message: `${f} required` },
          { status: 422 },
        );
      }
    }
    const amendmentId = await requestAmendment({
      requisitionId: id,
      amenderUserId: auth.userId,
      reason: String(body.reason),
      changesJson: body.changes_json ?? {},
      newTotalCents: Number(body.new_total_cents),
    });
    return NextResponse.json({ ok: true, amendment_id: amendmentId });
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
