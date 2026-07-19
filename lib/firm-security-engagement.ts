/**
 * Gap 3 — engagement-scoped firm access helper (additive; does not alter resolveFirmAccess).
 */
import { NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function resolveFirmAccessFromEngagement(
  req: Request,
  engagementId: string,
): Promise<{ response?: NextResponse; userId?: string; firmIds?: string[] }> {
  try {
    const ctx = await requireFirmAuth(req);
    const sb = createServiceClient();
    const { data: eng } = await sb
      .from("engagements")
      .select("firm_id")
      .eq("id", engagementId)
      .maybeSingle();
    if (!eng || !ctx.firmIds.includes(eng.firm_id as string)) {
      return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
    }
    return { userId: ctx.userId, firmIds: ctx.firmIds };
  } catch (e) {
    if (e instanceof ReviewerAuthError) {
      return { response: authErrorResponse(e) };
    }
    return { response: NextResponse.json({ error: "auth_failed" }, { status: 401 }) };
  }
}
