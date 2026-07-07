/**
 * Phase D6.5 Part 2 — Block 4
 * GET /api/ap-intake/duplicates?bill_id= — duplicate ledger rows for a bill.
 */
import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { listDuplicatesForBill } from "@/lib/ap-intake/duplicate/persist";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireFirmAuth(request);
    const billId = new URL(request.url).searchParams.get("bill_id");
    if (!billId) {
      return NextResponse.json({ error: "bill_id required" }, { status: 400 });
    }
    const supabase = createServiceClient();
    const duplicates = await listDuplicatesForBill(supabase, billId);
    return NextResponse.json({ duplicates });
  } catch (e) {
    return authErrorResponse(e);
  }
}
