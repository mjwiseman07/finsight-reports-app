import { NextResponse } from "next/server";
import {
  loadBriefingSettings,
  parseSettingsBody,
  resolveBriefingAccess,
  routeErrorResponse,
  upsertBriefingSettings,
} from "../../../../lib/client-briefing-service";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "client-briefing-settings-get", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") || "";
  const access = await resolveBriefingAccess(request, clientId);
  if (access.response) return access.response;

  try {
    const settings = await loadBriefingSettings(access, clientId);
    return NextResponse.json({ settings });
  } catch (error) {
    return routeErrorResponse(error, "Unable to load briefing settings.");
  }
}

export async function POST(request) {
  return saveSettings(request, "client-briefing-settings-create");
}

export async function PATCH(request) {
  return saveSettings(request, "client-briefing-settings-update");
}

async function saveSettings(request, key) {
  const rateLimitResponse = rateLimit(request, { key, limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));

  try {
    const input = parseSettingsBody(body);
    const access = await resolveBriefingAccess(request, input.clientId);
    if (access.response) return access.response;

    const settings = await upsertBriefingSettings(access, input);
    return NextResponse.json({ settings });
  } catch (error) {
    return routeErrorResponse(error, "Unable to save briefing settings.");
  }
}
