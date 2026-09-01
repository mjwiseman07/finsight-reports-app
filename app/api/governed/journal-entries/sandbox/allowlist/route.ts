import { NextResponse } from "next/server";
import { fetchSandboxAllowlistForCockpit } from "@/lib/journal-entry-governance/sandbox-je-cockpit-api";
import {
  guardSandboxJeCockpitRoute,
  toSandboxCockpitErrorResponse,
} from "@/lib/journal-entry-governance/sandbox-je-cockpit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await guardSandboxJeCockpitRoute(request);
  if (!guard.ok) return guard.response;

  try {
    const payload = await fetchSandboxAllowlistForCockpit();
    return NextResponse.json(payload);
  } catch (err) {
    return toSandboxCockpitErrorResponse(err);
  }
}
