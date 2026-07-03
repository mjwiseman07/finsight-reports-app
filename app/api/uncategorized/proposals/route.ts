import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { listProposals } from "@/lib/learning/proposal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const firmClientId = url.searchParams.get("firm_client_id");
  if (!firmClientId) {
    return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(req, { clientId: firmClientId })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const status = url.searchParams.get("status") ?? undefined;
  const bucket = url.searchParams.get("bucket") ?? undefined;
  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;

  try {
    const proposals = await listProposals(firmClientId, { status, bucket, limit });
    return NextResponse.json({ proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
