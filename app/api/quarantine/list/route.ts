/**
 * Phase D6.5 Part 2 — Block 3
 * GET /api/quarantine/list — open quarantines for caller's firm(s).
 */
import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { listOpenQuarantinesForFirm } from "@/lib/ap-intake/quarantine/quarantine-service";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const ctx = await requireFirmAuth(request);
    const supabase = createServiceClient();
    const rows = (
      await Promise.all(
        ctx.firmIds.map((firmId) => listOpenQuarantinesForFirm(supabase, firmId)),
      )
    ).flat();
    return NextResponse.json({ quarantines: rows });
  } catch (e) {
    return authErrorResponse(e);
  }
}
