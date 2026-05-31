import { NextResponse } from "next/server";
import {
  loadBriefingEvents,
  loadBriefingHistory,
  resolveBriefingAccess,
  routeErrorResponse,
} from "../../../../lib/client-briefing-service";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "client-briefing-history", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "";
  const briefingId = url.searchParams.get("briefing_id") || "";
  const access = await resolveBriefingAccess(request, clientId);
  if (access.response) return access.response;

  try {
    const briefings = await loadBriefingHistory(access, clientId);
    const events = briefingId ? await loadBriefingEvents(briefingId) : [];
    return NextResponse.json({ briefings, events });
  } catch (error) {
    return routeErrorResponse(error, "Unable to load briefing history.");
  }
}
