import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createRequisition } from "@/lib/ap-intake/requisitions/service";
import { RequisitionValidationError } from "@/lib/ap-intake/requisitions/validators";

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

    try {
      const result = await createRequisition({
        firmClientId: body.firmClientId,
        requesterUserId: auth.userId,
        vendorId: body.vendorId,
        vendorHintText: body.vendorHintText,
        neededBy: body.neededBy,
        justification: body.justification,
        currency: body.currency,
        lines: body.lines ?? [],
      });
      return NextResponse.json({ ok: true, ...result });
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
