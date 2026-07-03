import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { runUncategorizedScan } from "@/lib/learning/proposal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { firm_client_id, since } = body ?? {};
  if (!firm_client_id) {
    return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(req, { clientId: firm_client_id })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  try {
    const result = await runUncategorizedScan(firm_client_id, since);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
