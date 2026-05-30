import { NextResponse } from "next/server";
import {
  buildFirmReviewQueue,
  calculateFirmKpis,
  normalizeFirmClient,
} from "../../../../lib/advisory-firm-portal";
import { auditFirmEvent, resolveFirmAccess } from "../../../../lib/firm-security";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "firm-clients", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveFirmAccess(request);
  if (access.response) return access.response;

  const { data, error } = await supabaseAdmin
    .from("firm_clients")
    .select(
      "id, firm_id, name, group_name, package_level, subscription_status, health_status, health_score, last_package_generated, last_login, outstanding_review_items, upcoming_deliveries, weekly_brief_status, monthly_package_status, quarterly_review_status, owner_visibility_restricted, review_items, persona_views",
    )
    .in("firm_id", access.firmIds)
    .order("name", { ascending: true });

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Firm client storage is not configured yet." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to load firm clients." }, { status: 500 });
  }

  const clients = (data || []).map(normalizeFirmClient);

  await auditFirmEvent({
    eventType: "firm_portfolio_opened",
    firmId: access.firmIds[0],
    actorUserId: access.userId,
    metadata: { client_count: clients.length },
  });

  return NextResponse.json({
    clients,
    kpis: calculateFirmKpis(clients),
    review_queue: buildFirmReviewQueue(clients),
    access: {
      firm_ids: access.firmIds,
      roles: access.memberships.map((membership) => membership.role),
    },
  });
}
