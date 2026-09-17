import { NextRequest, NextResponse } from "next/server";
import { assertFirmClientAccess, authErrorResponse, requireFirmAuth } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireFirmAuth(request);
    const firmClientId = request.nextUrl.searchParams.get("firmClientId");
    if (!firmClientId) return NextResponse.json({ error: "firmClientId_required" }, { status: 400 });
    await assertFirmClientAccess({ firmClientId, firmIds: auth.firmIds });
    const { data, error } = await createServiceClient()
      .from("ra_pro_month_end_review_packages")
      .select("id, firm_client_id, provider, period_end, status, review_package, completed_at, created_at")
      .eq("firm_client_id", firmClientId)
      .order("period_end", { ascending: false })
      .limit(24);
    if (error) return NextResponse.json({ error: "month_end_packages_query_failed" }, { status: 500 });
    await assertFirmClientAccess({ firmClientId, firmIds: auth.firmIds });
    return NextResponse.json({ packages: data ?? [] });
  } catch (error) {
    return authErrorResponse(error);
  }
}
