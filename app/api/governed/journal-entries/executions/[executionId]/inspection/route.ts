import { NextResponse } from "next/server";
import { fetchSandboxInspectionForCockpit } from "@/lib/journal-entry-governance/sandbox-je-cockpit-api";
import {
  guardSandboxJeCockpitRoute,
  toSandboxCockpitErrorResponse,
} from "@/lib/journal-entry-governance/sandbox-je-cockpit-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ executionId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const guard = await guardSandboxJeCockpitRoute(request);
  if (!guard.ok) return guard.response;

  const { executionId } = await context.params;
  if (!executionId || !/^[0-9a-f-]{36}$/i.test(executionId)) {
    return NextResponse.json(
      { error: "executionId must be a UUID." },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchSandboxInspectionForCockpit(executionId);
    return NextResponse.json(payload);
  } catch (err) {
    return toSandboxCockpitErrorResponse(err);
  }
}
