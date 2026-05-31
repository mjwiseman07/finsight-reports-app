import { NextResponse } from "next/server";
import { resolveBriefingAccess, routeErrorResponse, updateBriefingStatus } from "../../../../lib/client-briefing-service";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "client-briefing-approve", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  const briefingId = String(body.briefing_id || body.briefingId || "").trim();

  if (!briefingId) {
    return NextResponse.json({ error: "briefing_id is required." }, { status: 400 });
  }

  const access = await resolveBriefingAccess(request);
  if (access.response) return access.response;

  try {
    const briefing = await updateBriefingStatus({
      access,
      briefingId,
      status: "Approved",
      eventType: "client_briefing_approved",
      eventDescription: "Advisor approved the client briefing for delivery.",
    });

    return NextResponse.json({ briefing });
  } catch (error) {
    return routeErrorResponse(error, "Unable to approve briefing.");
  }
}
