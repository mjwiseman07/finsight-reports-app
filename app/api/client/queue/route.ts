import { NextRequest, NextResponse } from "next/server";
import { requireClientAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ReviewerQueueResponse } from "@/lib/pre-close/reviewer-types";
import { mapQueueRow } from "@/lib/reviewer/queue-helpers";

export async function GET(req: NextRequest): Promise<NextResponse<ReviewerQueueResponse | { error: string }>> {
  try {
    const ctx = await requireClientAuth(req);
    const supabase = createServiceClient();

    const { data: clients } = await supabase
      .from("firm_clients")
      .select("id, firm_id")
      .in("id", ctx.firmClientIds);
    const firmIds = [...new Set((clients ?? []).map((c) => c.firm_id as string))];

    const { data: engagements } = await supabase
      .from("engagements")
      .select("id")
      .in("firm_id", firmIds);
    const engagementIds = (engagements ?? []).map((e) => e.id as string);
    if (!engagementIds.length) {
      return NextResponse.json({ items: [], cursor: null, total: 0 });
    }

    const { data: visibility } = await supabase
      .from("engagement_review_visibility")
      .select("engagement_id")
      .in("engagement_id", engagementIds)
      .eq("client_can_view_queue", true);
    const visibleIds = (visibility ?? []).map((v) => v.engagement_id as string);
    if (!visibleIds.length) {
      return NextResponse.json({ items: [], cursor: null, total: 0 });
    }

    const { data: rows, count } = await supabase
      .from("pre_close_review_items")
      .select("*, firm_clients(name), engagements(engagement_name)", { count: "exact" })
      .in("engagement_id", visibleIds)
      .order("created_at", { ascending: false })
      .limit(50);

    const items = (rows ?? []).map((r) => mapQueueRow(r));
    return NextResponse.json({ items, cursor: null, total: count ?? items.length });
  } catch (e) {
    return authErrorResponse(e) as NextResponse<ReviewerQueueResponse | { error: string }>;
  }
}
