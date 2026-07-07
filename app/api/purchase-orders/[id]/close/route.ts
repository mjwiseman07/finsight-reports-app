import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { closePurchaseOrder } from "@/lib/ap-intake/purchase-orders/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });

    const { id } = await ctx.params;

    try {
      await closePurchaseOrder(id, auth.userId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json(
        { error: "internal", message: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  } catch (e) {
    return authErrorResponse(e);
  }
}
