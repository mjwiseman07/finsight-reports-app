import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { approveRequisition } from "@/lib/ap-intake/requisitions/service";
import { RequisitionValidationError } from "@/lib/ap-intake/requisitions/validators";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });

    const { id } = await ctx.params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      /* body optional */
    }

    try {
      await approveRequisition({
        requisitionId: id,
        approverUserId: auth.userId,
        comment: body?.comment,
      });
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof RequisitionValidationError) {
        return NextResponse.json(
          { error: "validation", field: err.field, message: err.message },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: "internal", message: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  } catch (e) {
    return authErrorResponse(e);
  }
}
