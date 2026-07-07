import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createPurchaseOrderFromRequisition } from "@/lib/ap-intake/purchase-orders/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body.requisitionId) {
      return NextResponse.json({ error: "requisitionId required" }, { status: 400 });
    }

    try {
      const result = await createPurchaseOrderFromRequisition({
        requisitionId: body.requisitionId,
        actorUserId: auth.userId,
        vendorId: body.vendorId,
        expectedDeliveryAt: body.expectedDeliveryAt,
      });
      return NextResponse.json({ ok: true, ...result });
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
