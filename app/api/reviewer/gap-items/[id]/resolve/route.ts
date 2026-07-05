import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  resolveGapReviewItem,
  GapResolveError,
} from "@/lib/assertions/gap-review-item-resolver";
import { runProjectionWorker } from "@/lib/assertions/projection-worker";
import type { GapResolutionType } from "@/lib/pre-close/assertions-coverage-types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ResolveBody {
  resolutionType: GapResolutionType;
  resolutionMetadata: Record<string, unknown>;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id } = await params;
    const body = (await req.json()) as ResolveBody;
    const db = createServiceClient();

    const { data: row } = await db
      .from("close_gap_review_items")
      .select("engagement_id, firm_client_id, close_period_id")
      .eq("id", id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: eng } = await db
      .from("engagements")
      .select("firm_id")
      .eq("id", row.engagement_id as string)
      .maybeSingle();
    const firmId = eng?.firm_id as string | undefined;
    if (!firmId || !ctx.writerFirmIds.includes(firmId)) {
      throw new ReviewerAuthError("writer_required", 403);
    }
    if (!ctx.userId) throw new ReviewerAuthError("user_id_missing", 401);

    const resolved = await resolveGapReviewItem(db, id, {
      resolutionType: body.resolutionType,
      resolutionMetadata: body.resolutionMetadata ?? {},
      resolvedByUserId: ctx.userId,
    });

    await runProjectionWorker(
      row.firm_client_id as string,
      row.close_period_id as string,
    );

    return NextResponse.json({ item: resolved });
  } catch (e) {
    if (e instanceof GapResolveError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return authErrorResponse(e);
  }
}
