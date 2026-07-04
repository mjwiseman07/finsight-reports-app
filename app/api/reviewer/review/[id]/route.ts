import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { loadReviewItemForFirm } from "@/lib/reviewer/review-detail";
import type { ReviewItemDetail } from "@/lib/pre-close/reviewer-types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ReviewItemDetail | { error: string }>> {
  try {
    const ctx = await requireFirmAuth(_req);
    const { id } = await params;
    const detail = await loadReviewItemForFirm(id, ctx);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return authErrorResponse(e) as NextResponse<ReviewItemDetail | { error: string }>;
  }
}
