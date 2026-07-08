import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { getCurrentEffectiveSettings } from "@/lib/ap-intake/presets/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const result = await getCurrentEffectiveSettings({ firmId });
    return NextResponse.json({ effective_settings: result });
  } catch (e) {
    return authErrorResponse(e);
  }
}
