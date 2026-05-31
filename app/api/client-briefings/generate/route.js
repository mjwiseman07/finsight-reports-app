import { NextResponse } from "next/server";
import { generateBriefing, resolveBriefingAccess, routeErrorResponse } from "../../../../lib/client-briefing-service";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "client-briefing-generate", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  const clientId = String(body.client_id || body.clientId || "").trim();

  if (!clientId) {
    return NextResponse.json({ error: "client_id is required." }, { status: 400 });
  }

  const access = await resolveBriefingAccess(request, clientId);
  if (access.response) return access.response;

  try {
    const briefing = await generateBriefing({
      access,
      clientId,
      periodStart: body.period_start || body.periodStart,
      periodEnd: body.period_end || body.periodEnd,
      metrics: body.metrics,
      forceStatus: body.save_as_draft ? "Draft" : "",
    });

    return NextResponse.json({ briefing });
  } catch (error) {
    return routeErrorResponse(error, "Unable to generate briefing.");
  }
}
