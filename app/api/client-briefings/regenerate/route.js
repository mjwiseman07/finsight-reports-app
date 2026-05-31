import { NextResponse } from "next/server";
import {
  generateBriefing,
  loadBriefingForFirm,
  resolveBriefingAccess,
  routeErrorResponse,
} from "../../../../lib/client-briefing-service";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "client-briefing-regenerate", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  const briefingId = String(body.briefing_id || body.briefingId || "").trim();
  const clientId = String(body.client_id || body.clientId || "").trim();

  if (!briefingId && !clientId) {
    return NextResponse.json({ error: "briefing_id or client_id is required." }, { status: 400 });
  }

  const access = await resolveBriefingAccess(request, clientId || undefined);
  if (access.response) return access.response;

  try {
    const sourceBriefing = briefingId ? await loadBriefingForFirm(access, briefingId) : null;
    const briefing = await generateBriefing({
      access,
      clientId: clientId || sourceBriefing.clientId,
      periodStart: body.period_start || sourceBriefing?.periodStart,
      periodEnd: body.period_end || sourceBriefing?.periodEnd,
      metrics: body.metrics,
    });

    return NextResponse.json({ briefing });
  } catch (error) {
    return routeErrorResponse(error, "Unable to regenerate briefing.");
  }
}
