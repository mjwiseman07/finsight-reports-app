import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security";
import { executeRulesForClient } from "@/lib/rules/rule-execution-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firmClientId = (body.firm_client_id ?? body.firmClientId) as string | undefined;
  const closePeriodId = (body.close_period_id ?? body.closePeriodId) as string | undefined;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm_client_id is required" }, { status: 400 });
  }
  if (!closePeriodId) {
    return NextResponse.json({ error: "close_period_id is required" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(request, { clientId: firmClientId })) as {
    response?: NextResponse;
  };
  if (access.response) return access.response;

  try {
    const result = await executeRulesForClient(firmClientId, closePeriodId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
