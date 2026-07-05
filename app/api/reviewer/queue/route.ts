import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type { ReviewerQueueResponse } from "@/lib/pre-close/reviewer-types";
import {
  decodeCursor,
  encodeCursor,
  mapQueueRow,
  mapGapQueueRow,
  matchesStatusFilter,
  severityToDb,
} from "@/lib/reviewer/queue-helpers";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ReviewerQueueResponse | { error: string }>> {
  try {
    const ctx = await requireFirmAuth(req);
    const params = req.nextUrl.searchParams;
    const engagementId = params.get("engagementId") ?? undefined;
    const closePeriodId = params.get("closePeriodId") ?? undefined;
    const severity = params.get("severity") as "info" | "warn" | "error" | null;
    const status = (params.get("status") ?? "all") as
      | "pending"
      | "decided"
      | "posted"
      | "blocked"
      | "all";
    const ruleId = params.get("ruleId") ?? undefined;
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(params.get("limit") ?? DEFAULT_LIMIT)),
    );
    const cursorRaw = params.get("cursor");
    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;

    const supabase = createServiceClient();

    const { data: engagements } = await supabase
      .from("engagements")
      .select("id")
      .in("firm_id", ctx.firmIds);
    const engagementIds = (engagements ?? []).map((e) => e.id as string);
    if (engagementIds.length === 0) {
      return NextResponse.json({ items: [], gapItems: [], cursor: null, total: 0 });
    }

    let query = supabase
      .from("pre_close_review_items")
      .select(
        "*, firm_clients(name), engagements(engagement_name)",
        { count: "exact" },
      )
      .in("engagement_id", engagementId ? [engagementId] : engagementIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (closePeriodId) query = query.eq("close_period_id", closePeriodId);
    if (ruleId) query = query.eq("rule_id", ruleId);
    if (severity) query = query.in("severity", severityToDb(severity));
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.lastCreatedAt},and(created_at.eq.${cursor.lastCreatedAt},id.lt.${cursor.lastId})`,
      );
    }

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[reviewer/queue]", error);
      return NextResponse.json({ error: "query_failed" }, { status: 500 });
    }

    let filtered = (rows ?? []).filter((r) => matchesStatusFilter(r, status));
    const hasMore = filtered.length > limit;
    if (hasMore) filtered = filtered.slice(0, limit);

    const attemptIds = filtered
      .map((r) => r.posted_je_attempt_id as string | null)
      .filter(Boolean) as string[];
    const qboMap = new Map<string, string>();
    if (attemptIds.length) {
      const { data: attempts } = await supabase
        .from("je_post_attempts")
        .select("attempt_id, qbo_je_id")
        .in("attempt_id", attemptIds);
      for (const a of attempts ?? []) {
        if (a.qbo_je_id) qboMap.set(a.attempt_id as string, a.qbo_je_id as string);
      }
    }

    const items = filtered.map((r) => {
      const mapped = mapQueueRow(r);
      const aid = r.posted_je_attempt_id as string | null;
      if (aid && qboMap.has(aid)) mapped.qboJeId = qboMap.get(aid) ?? null;
      return mapped;
    });

    let gapItems: unknown[] = [];
    if (!ruleId) {
      let gapQuery = supabase
        .from("close_gap_review_items")
        .select("*, engagements(engagement_name), firm_clients(name)")
        .in("engagement_id", engagementId ? [engagementId] : engagementIds)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (closePeriodId) gapQuery = gapQuery.eq("close_period_id", closePeriodId);
      if (status === "pending") gapQuery = gapQuery.eq("resolution_status", "open");
      else if (status === "decided") gapQuery = gapQuery.neq("resolution_status", "open");
      if (severity) {
        const sev =
          severity === "error" ? "critical" : severity === "warn" ? "warning" : "info";
        gapQuery = gapQuery.eq("severity", sev);
      }
      const { data: gd } = await gapQuery;
      gapItems = gd ?? [];
    }

    let nextCursor: string | null = null;
    if (hasMore && filtered.length) {
      const last = filtered[filtered.length - 1];
      nextCursor = encodeCursor({
        lastCreatedAt: String(last.created_at),
        lastId: String(last.id),
      });
    }

    return NextResponse.json({
      items,
      gapItems: gapItems.map((r) => mapGapQueueRow(r as Parameters<typeof mapGapQueueRow>[0])),
      cursor: nextCursor,
      total: count ?? items.length,
    });
  } catch (e) {
    return authErrorResponse(e) as NextResponse<ReviewerQueueResponse | { error: string }>;
  }
}
