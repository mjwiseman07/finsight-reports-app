import { NextResponse } from "next/server";
import { loadBriefingDashboard, resolveBriefingAccess, routeErrorResponse } from "../../../../lib/client-briefing-service";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "client-briefings-dashboard", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveBriefingAccess(request);
  if (access.response) return access.response;

  try {
    const dashboard = await loadBriefingDashboard(access);
    return NextResponse.json(dashboard);
  } catch (error) {
    return routeErrorResponse(error, "Unable to load Client Briefings dashboard.");
  }
}
