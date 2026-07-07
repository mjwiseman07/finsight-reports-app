import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { startBaselineHarvest } from "@/lib/ap-intake/baseline-harvest/orchestrator";

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

    if (!body.firmClientId || !body.source) {
      return NextResponse.json({ error: "firmClientId and source required" }, { status: 400 });
    }

    if (!["qbo", "csv"].includes(body.source)) {
      return NextResponse.json({ error: "source must be qbo or csv" }, { status: 400 });
    }

    try {
      const result = await startBaselineHarvest({
        firmId,
        firmClientId: body.firmClientId,
        source: body.source,
        actorUserId: auth.userId,
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
