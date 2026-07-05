import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { rowToGapReviewItem } from "@/lib/assertions/gap-review-item-resolver";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id } = await params;
    const db = createServiceClient();
    const { data: row } = await db
      .from("close_gap_review_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: eng } = await db
      .from("engagements")
      .select("firm_id")
      .eq("id", row.engagement_id as string)
      .maybeSingle();
    if (!eng || !ctx.firmIds.includes(eng.firm_id as string)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: assertion } = await db
      .from("assertions_catalog")
      .select("assertion_id, display_name, description, isa_315_label, authoritative_citation")
      .eq("assertion_id", row.assertion_id as string)
      .maybeSingle();

    return NextResponse.json({
      item: rowToGapReviewItem(row),
      assertion: assertion ?? null,
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
