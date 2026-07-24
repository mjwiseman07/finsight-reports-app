import { NextResponse } from "next/server";
import { requireAuditReadyUser } from "@/lib/audit-ready/server-auth";
import { listVisibleEngagementIds } from "@/lib/audit-ready/kickouts/list-visible-engagements.js";
import { listKickouts } from "@/lib/audit-ready/kickouts/list-kickouts.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuditReadyUser();
  if ("error" in auth) return auth.error;

  const engagementIds = await listVisibleEngagementIds(auth.user.id);
  if (engagementIds.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const url = new URL(req.url);
  const ageFilter = url.searchParams.get("age");
  const statusFilter = url.searchParams.get("status");

  const allRows = await listKickouts(engagementIds);
  let filtered = allRows;

  if (
    ageFilter &&
    ["new_this_close", "carried_over", "stale"].includes(ageFilter)
  ) {
    filtered = filtered.filter((r) => r.age_bucket === ageFilter);
  }

  const defaultStatuses = new Set(["pending", "escalated"]);
  if (statusFilter === "all") {
    // no status filter
  } else if (statusFilter) {
    const allow = new Set(statusFilter.split(",").filter(Boolean));
    filtered = filtered.filter((r) => {
      const s = r.latest_investigation?.resolution_status ?? "pending";
      return allow.has(s);
    });
  } else {
    filtered = filtered.filter((r) => {
      const s = r.latest_investigation?.resolution_status ?? "pending";
      return defaultStatuses.has(s);
    });
  }

  return NextResponse.json({ rows: filtered });
}
